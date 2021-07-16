"use strict";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSimulation(canvas, gl) {
  resizeCanvas();

  let width = canvas.clientWidth;
  let height = canvas.clientHeight;

  let dx = 1.0 / width;
  let dy = 1.0 / height;

  function pointerPrototype() {
    this.x = 0;
    this.y = 0;
    this.x_prev = 0;
    this.y_prev = 0;
    this.dx = 0;
    this.dy = 0;
    this.down = false;
    this.moved = false;
  }

  let pointer = new pointerPrototype();

  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("OES_texture_float_linear");
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  function createProgram(vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    } else {
      console.trace(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return undefined;
    }
  }

  function getUniforms(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformName = gl.getActiveUniform(program, i).name;
      uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
  }

  function execProgram(target) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    if (target == null)
      gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    else gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    } else {
      gl.deleteShader(shader);
      console.error("shader compile failed: " + source);
      return undefined;
    }
  }

  function loadShaderFromFile(url) {
    return fetch(url).then((response) => response.text());
  }

  const shaderFiles = [
    "shaders/stencil.vert",
    "shaders/advection.frag",
    "shaders/divergence.frag",
    "shaders/gradient_corr.frag",
    "shaders/pressure.frag",
    "shaders/output.frag",
    "shaders/ext_force.frag",
    "shaders/copy.frag",
  ];
  const shader = await Promise.all(shaderFiles.map(loadShaderFromFile));

  var stencilShader = compileShader(gl.VERTEX_SHADER, shader[0]);
  var advectionShader = compileShader(gl.FRAGMENT_SHADER, shader[1]);
  var divergenceShader = compileShader(gl.FRAGMENT_SHADER, shader[2]);
  var gradientCorrShader = compileShader(gl.FRAGMENT_SHADER, shader[3]);
  var pressureShader = compileShader(gl.FRAGMENT_SHADER, shader[4]);
  var outputShader = compileShader(gl.FRAGMENT_SHADER, shader[5]);
  var extForceShader = compileShader(gl.FRAGMENT_SHADER, shader[6]);
  var copyShader = compileShader(gl.FRAGMENT_SHADER, shader[7]);

  const forceProgram = createProgram(stencilShader, extForceShader);
  const copyProgram = createProgram(stencilShader, copyShader);
  const outputProgram = createProgram(stencilShader, outputShader);
  const advectionProgram = createProgram(stencilShader, advectionShader);
  const divergenceProgram = createProgram(stencilShader, divergenceShader);
  const pressureProgram = createProgram(stencilShader, pressureShader);
  const gradientCorrectionProgram = createProgram(
    stencilShader,
    gradientCorrShader
  );

  const forceParams = getUniforms(forceProgram);
  const copyParams = getUniforms(copyProgram);
  const outputParams = getUniforms(outputProgram);
  const advectionParams = getUniforms(advectionProgram);
  const divergenceParams = getUniforms(divergenceProgram);
  const gradientCorrectionParams = getUniforms(gradientCorrectionProgram);
  const pressureParams = getUniforms(pressureProgram);

  function createFramebuffer(init) {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      width,
      height,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );

    let framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.viewport(0, 0, width, height);
    if (init) gl.clearColor(init.x, init.y, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      framebuffer,
      activate(id) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createFramebufferPair(init) {
    let fb_old = createFramebuffer(init);
    let fb_new = createFramebuffer(init);
    return {
      get old() {
        return fb_old;
      },
      set old(value) {
        fb_old = value;
      },
      get new() {
        return fb_new;
      },
      set new(value) {
        fb_new = value;
      },
      swapMem() {
        let temp = fb_old;
        fb_old = fb_new;
        fb_new = temp;
      },
    };
  }
  gl.disable(gl.BLEND);

  let ux = 200.0;
  let uInit = {
    x: ux,
    y: 0.0,
  };
  let u = createFramebufferPair(uInit);
  let div = createFramebuffer();
  let p = createFramebufferPair();

  let tOld = Date.now();
  let t;
  let dt;

  var fps_hist = [];
  const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length;

  await sleep(1500);

  simulate();

  function simulate() {
    t = Date.now();
    if (fps_hist.length >= 15) {
      fps_hist.shift();
      const fps_avg = average(fps_hist);
      if (fps_avg < 30) {
        downscaleFramebuffer();
        fps_hist = [];
      }
    }
    fps_hist.push(1.0 / ((t - tOld) / 1000.0));
    dt = Math.min((t - tOld) / 1000, 1 / 60);
    tOld = t;

    if (canvasVisible) {
      gl.disable(gl.BLEND);

      addForce();

      // divergence
      gl.useProgram(divergenceProgram);
      gl.uniform2fv(divergenceParams.dx, [dx, dy]);
      gl.uniform1i(divergenceParams.u, u.old.activate(0));
      execProgram(div.framebuffer);

      // pressure
      gl.useProgram(pressureProgram);
      gl.uniform2fv(pressureParams.dx, [dx, dy]);
      gl.uniform1i(pressureParams.div, div.activate(0));
      for (let i = 0; i < 50; i++) {
        gl.uniform1i(pressureParams.u, p.old.activate(1));
        execProgram(p.new.framebuffer);
        p.swapMem();
      }

      // pressure correction step
      gl.useProgram(gradientCorrectionProgram);
      gl.uniform2fv(gradientCorrectionParams.dx, [dx, dy]);
      gl.uniform1i(gradientCorrectionParams.p, p.old.activate(0));
      gl.uniform1i(gradientCorrectionParams.u, u.old.activate(1));
      execProgram(u.new.framebuffer);
      u.swapMem();

      // advection
      gl.useProgram(advectionProgram);
      gl.uniform2f(advectionParams.dx, dx, dy);
      gl.uniform1i(advectionParams.u, u.old.activate(0));
      gl.uniform1f(advectionParams.dt, dt);
      gl.uniform1f(advectionParams.ux, ux);
      gl.uniform1f(advectionParams.aspectRatio, canvas.width / canvas.height);
      gl.uniform1i(advectionParams.karman, false);
      execProgram(u.new.framebuffer);
      u.swapMem();

      // render to canvas
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      gl.useProgram(outputProgram);
      gl.uniform1i(outputParams.plot, u.old.activate(0));
      execProgram(null);
    }

    requestAnimationFrame(simulate);
  }

  function resizeCanvas(multiplier) {
    multiplier = multiplier || 1;
    const width = (canvas.clientWidth * multiplier) | 0;
    const height = (canvas.clientHeight * multiplier) | 0;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  function addForce() {
    if (pointer.moved && !pointer.down) {
      pointer.moved = false;
      const scale = 5000.0;
      gl.useProgram(forceProgram);
      gl.uniform1i(forceParams.u, u.old.activate(0));
      gl.uniform2fv(forceParams.pos, [pointer.x_prev, pointer.y_prev]);
      gl.uniform2fv(forceParams.force, [
        pointer.dx * scale,
        pointer.dy * scale,
      ]);
      gl.uniform1f(forceParams.aspectRatio, canvas.width / canvas.height);
      gl.uniform1f(forceParams.radius, 0.0025);
      execProgram(u.new.framebuffer);
      u.swapMem();
      pointer = new pointerPrototype();
    }
  }

  canvas.addEventListener("mousedown", (e) => {
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    updatePointerDownData(posX, posY);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!pointer.down) return;
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    updatePointerMoveData(posX, posY);
  });

  window.addEventListener("mouseup", () => {
    pointer.down = false;
  });

  function updatePointerDownData(posX, posY) {
    pointer.down = true;
    pointer.moved = false;
    pointer.x = posX / width;
    pointer.y = 1.0 - posY / height;
    pointer.x_prev = pointer.x;
    pointer.y_prev = pointer.y;
    pointer.dx = 0;
    pointer.dy = 0;
  }

  function updatePointerMoveData(posX, posY) {
    //pointer.x_prev = pointer.x;
    //pointer.y_prev = pointer.y;
    pointer.x = posX / width;
    pointer.y = 1.0 - posY / height;
    pointer.dx = correctDeltaX(pointer.x - pointer.x_prev);
    pointer.dy = correctDeltaY(pointer.y - pointer.y_prev);
    pointer.moved = Math.abs(pointer.dx) > 0 || Math.abs(pointer.dy) > 0;
  }

  function correctDeltaX(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  function correctDeltaY(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  function scaleByPixelRatio(input) {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  }

  function resizeFramebuffer(target) {
    let newFB = createFramebuffer();
    gl.useProgram(copyProgram);
    gl.uniform1i(copyParams.toCopy, target.activate(0));
    execProgram(newFB.framebuffer);
    return newFB;
  }

  function resizeFramebufferPair(target) {
    target.old = resizeFramebuffer(target.old);
    target.new = createFramebuffer();
    return target;
  }

  function downscaleFramebuffer() {
    const aspectRatio = canvas.width / canvas.height;
    const width_lb = 400;
    const height_lb = Math.round(1000 / aspectRatio);
    if (width == width_lb && height == height_lb) return;
    width = Math.max(width_lb, Math.round(width / (4 / 3)));
    height = Math.max(height_lb, Math.round(height / (4 / 3)));
    console.log(
      "[Low FPS warning]: downscaling simulation resolution to " +
        width +
        "x" +
        height
    );
    u = resizeFramebufferPair(u);
    div = resizeFramebuffer(div);
    p = resizeFramebufferPair(p);
  }
}

async function runAnimation(canvas, gl) {
  resizeCanvas();

  let width = canvas.clientWidth;
  let height = canvas.clientHeight;

  let dx = 1.0 / width;
  let dy = 1.0 / height;

  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("OES_texture_float_linear");
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  function createProgram(vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    } else {
      console.trace(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return undefined;
    }
  }

  function getUniforms(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformName = gl.getActiveUniform(program, i).name;
      uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
  }

  function execProgram(target) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    } else {
      gl.deleteShader(shader);
      console.error("shader compile failed: " + source);
      return undefined;
    }
  }

  function loadShaderFromFile(url) {
    return fetch(url).then((response) => response.text());
  }

  const shaderFiles = ["shaders/stencil.vert", "shaders/elliptic_curve.frag"];
  const shader = await Promise.all(shaderFiles.map(loadShaderFromFile));

  var stencilShader = compileShader(gl.VERTEX_SHADER, shader[0]);
  var ellipticCurveShader = compileShader(gl.FRAGMENT_SHADER, shader[1]);

  const ellipticCurveProgram = createProgram(
    stencilShader,
    ellipticCurveShader
  );
  const ellipticCurveParams = getUniforms(ellipticCurveProgram);

  let tOld = Date.now();
  const t0 = tOld;
  let t;
  let dt;

  simulate();

  function simulate() {
    t = Date.now();
    dt = Math.min((t - tOld) / 1000, 1 / 60);
    tOld = t;

    if (canvasVisible) {
      // render to canvas
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      gl.useProgram(ellipticCurveProgram);
      gl.uniform1f(ellipticCurveParams.t, (t - t0) / 1000);
      execProgram(null);
    }

    requestAnimationFrame(simulate);
  }

  function resizeCanvas(multiplier) {
    multiplier = multiplier || 1;
    const width = (canvas.clientWidth * multiplier) | 0;
    const height = (canvas.clientHeight * multiplier) | 0;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }
}

const canvas = document.getElementsByTagName("canvas")[0];

var canvasVisible = true;

window.addEventListener("scroll", () => {
  let scrollPosition = document.documentElement.scrollTop;
  if (scrollPosition > canvas.height) canvasVisible = false;
  else canvasVisible = true;
});

const params = {
  alpha: true,
  depth: false,
  stencil: false,
  antialias: false,
  preserveDrawingBuffer: false,
};
let gl = canvas.getContext("webgl2", params);

if (gl) {
  if (window.matchMedia("screen and (min-width: 700px)").matches) {
    runSimulation(canvas, gl);
  } else {
    runAnimation(canvas, gl);
  }
} else {
  canvas.style.background = 'url("img/Lorenz.svg")';
  canvas.style.backgroundPosition = "center";
  canvas.style.backgroundSize = "90% auto";
  canvas.style.backgroundRepeat = "no-repeat";
  canvas.style.opacity = "0.5";
  canvas.style.zIndex = "0";
}
