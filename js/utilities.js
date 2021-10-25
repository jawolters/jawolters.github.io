var nodes = Array.from(
  document.getElementsByClassName("timeline")[0].getElementsByTagName("h1")
);
Array.from(document.getElementsByClassName("wrapper")).forEach((elem) =>
  nodes.push(elem)
);
const portrait = document.getElementsByClassName("portrait")[0];
var icons = Array.from(
  portrait.parentElement.parentElement
    .getElementsByClassName("icons")[0]
    .getElementsByTagName("a")
);
var skills_nav = document.getElementsByClassName("skills_nav")[0];
var skills_content = document.getElementsByClassName("skills_content")[0];
skills_nav.getElementsByClassName("skill_math")[0].classList.toggle("active");

const cache = {
  viewport: {},
  rects: [],
};

const start = Date.now();
window.addEventListener("load", init);

function init() {
  recache();
  document.addEventListener("scroll", throttle(scrollCheck, 10));
  //window.addEventListener("resize", debounce(recache, 50));

  window.addEventListener('resize', function () { 
    "use strict";
    window.location.reload(); 
});
}

window.smoothScroll = function (target, id) {
  Array.from(skills_nav.getElementsByTagName("h2")).forEach((element, i) => {
    if (element.classList.contains("active"))
      element.classList.toggle("active");
    if (i == id) element.classList.toggle("active");
  });

  var scrollContainer = target;
  do {
    scrollContainer = skills_content;
    if (!scrollContainer) return;
    scrollContainer.scrollLeft += 1;
  } while (scrollContainer.scrollLeft == 0);

  var targetX = 0;
  do {
    if (target == scrollContainer) break;
    targetX += target.offsetLeft;
  } while ((target = target.offsetParent));

  scroll = function (c, a, b, i) {
    i++;
    if (i > 20) return;
    c.scrollLeft = a + ((b - a) / 20) * i;
    setTimeout(function () {
      scroll(c, a, b, i);
    }, 20);
  };

  scroll(
    scrollContainer,
    scrollContainer.scrollLeft,
    targetX - skills_content.offsetLeft,
    0
  );
};

function recache() {
  cache.viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  nodes.forEach((node, i) => {
    cache.rects[i] = rect(node);
  });
  cache.rects.push(rect(portrait));
  scrollCheck();
}

function scrollCheck() {
  const offset = getScrollOffset();
  const midline = cache.viewport.height * 0.5;

  if (offset.y > 200) {
    arrow = document.getElementsByClassName("landing_arrow")[0];
    if (!arrow.classList.contains("vanish")) {
      if (Math.floor((Date.now() - start) / 1000) < 8)
        arrow.style.display = "none";
      else arrow.classList.toggle("vanish");
    }
  }

  icons.forEach((icon) =>
    icon.classList.toggle(
      "active",
      cache.rects[cache.rects.length - 1].y - offset.y < midline
    )
  );
  if (icons.length > 0) if (icons[0].classList.contains("active")) icons = [];

  cache.rects.forEach((rect, i) => {
    if (i != cache.rects.length - 1) {
      if (nodes[i].classList[0] == "wrapper") {
        nodes[i].classList.toggle(
          "active",
          rect.y - offset.y < midline && rect.y2 - offset.y > midline
        );
      } else nodes[i].classList.toggle("active", rect.y - offset.y < midline);
    }
  });
}

function getScrollOffset() {
  return {
    x: window.pageXOffset,
    y: window.pageYOffset,
  };
}

function throttle(fn, limit, context) {
  let wait;
  return function () {
    context = context || this;
    if (!wait) {
      fn.apply(context, arguments);
      wait = true;
      return setTimeout(function () {
        wait = false;
      }, limit);
    }
  };
}

function debounce(fn, limit, u) {
  let e;
  return function () {
    const i = this;
    const o = arguments;
    const a = u && !e;
    clearTimeout(e),
      (e = setTimeout(function () {
        (e = null), u || fn.apply(i, o);
      }, limit)),
      a && fn.apply(i, o);
  };
}

function rect(e) {
  const o = getScrollOffset();
  const r = e.getBoundingClientRect();

  return {
    x: r.left + o.x,
    y: r.top + o.y,
    y2: r.bottom + o.y,
  };
}
