const nodes = Array.from(document.getElementsByTagName("h1"));
const portrait = document.getElementsByClassName("portrait")[0];
var icons = Array.from(portrait.parentElement.getElementsByClassName('icons')[0].getElementsByTagName('a'));

const cache = {
	viewport: {},
	rects: []
};

const start = Date.now();
window.addEventListener("load", init);

function init() {
	recache();
	document.addEventListener("scroll", throttle(scrollCheck, 10));
	window.addEventListener("resize", debounce(recache, 50));
};

function recache() {
	cache.viewport = {
			width: window.innerWidth,
			height: window.innerHeight
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

	if(offset.y > 200){
		arrow = document.getElementsByClassName("landing_arrow")[0];
		if(!arrow.classList.contains("vanish")){
			if(Math.floor((Date.now() - start) / 1000) < 8)
				arrow.style.display = "none";
			else
				arrow.classList.toggle("vanish");
		}	
	}
	
	icons.forEach(icon => icon.classList.toggle("active", cache.rects[cache.rects.length-1].y - offset.y < midline));
	if(icons.length > 0)
		if(icons[0].classList.contains("active")) 
			icons = [];

	cache.rects.forEach((rect, i) => {	
		if(i!=cache.rects.length-1) nodes[i].classList.toggle("active", rect.y - offset.y < midline);		
	});		
};

function getScrollOffset() {
	return {
		x: window.pageXOffset,
		y: window.pageYOffset
	};
};

function throttle(fn, limit, context) {
	let wait;
	return function() {
		context = context || this;
		if (!wait) {
			fn.apply(context, arguments);
			wait = true;
			return setTimeout(function() {
				wait = false;
			}, limit);
		}
	};
};

function debounce(fn, limit, u) {
	let e;
	return function() {
		const i = this;
		const o = arguments;
		const a = u && !e;
		clearTimeout(e),
			(e = setTimeout(function() {
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
			y: r.top + o.y
	};
};
