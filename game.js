/*! Built with IMPACT - impactjs.com */

(function (window) {
    "use strict";
    Number.prototype.map = function (istart, istop, ostart, ostop) {
        return ostart + (ostop - ostart) * ((this - istart) / (istop - istart));
    };
    Number.prototype.limit = function (min, max) {
        return Math.min(max, Math.max(min, this));
    };
    Number.prototype.round = function (precision) {
        precision = Math.pow(10, precision || 0);
        return Math.round(this * precision) / precision;
    };
    Number.prototype.floor = function () {
        return Math.floor(this);
    };
    Number.prototype.ceil = function () {
        return Math.ceil(this);
    };
    Number.prototype.toInt = function () {
        return this | 0;
    };
    Number.prototype.toRad = function () {
        return (this / 180) * Math.PI;
    };
    Number.prototype.toDeg = function () {
        return (this * 180) / Math.PI;
    };
    Array.prototype.erase = function (item) {
        for (var i = this.length; i--; ) {
            if (this[i] === item) {
                this.splice(i, 1);
            }
        }
        return this;
    };
    Array.prototype.random = function () {
        return this[Math.floor(Math.random() * this.length)];
    };
    Function.prototype.bind =
        Function.prototype.bind ||
        function (oThis) {
            if (typeof this !== "function") {
                throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
            }
            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function () {},
                fBound = function () {
                    return fToBind.apply(this instanceof fNOP && oThis ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
                };
            fNOP.prototype = this.prototype;
            fBound.prototype = new fNOP();
            return fBound;
        };
    window.ig = {
        game: null,
        debug: null,
        version: "1.23",
        global: window,
        modules: {},
        resources: [],
        ready: false,
        baked: false,
        nocache: "",
        ua: {},
        prefix: window.ImpactPrefix || "",
        lib: "lib/",
        _current: null,
        _loadQueue: [],
        _waitForOnload: 0,
        $: function (selector) {
            return selector.charAt(0) == "#" ? document.getElementById(selector.substr(1)) : document.getElementsByTagName(selector);
        },
        $new: function (name) {
            return document.createElement(name);
        },
        copy: function (object) {
            if (!object || typeof object != "object" || object instanceof HTMLElement || object instanceof ig.Class) {
                return object;
            } else if (object instanceof Array) {
                var c = [];
                for (var i = 0, l = object.length; i < l; i++) {
                    c[i] = ig.copy(object[i]);
                }
                return c;
            } else {
                var c = {};
                for (var i in object) {
                    c[i] = ig.copy(object[i]);
                }
                return c;
            }
        },
        merge: function (original, extended) {
            for (var key in extended) {
                var ext = extended[key];
                if (typeof ext != "object" || ext instanceof HTMLElement || ext instanceof ig.Class || ext === null) {
                    original[key] = ext;
                } else {
                    if (!original[key] || typeof original[key] != "object") {
                        original[key] = ext instanceof Array ? [] : {};
                    }
                    ig.merge(original[key], ext);
                }
            }
            return original;
        },
        ksort: function (obj) {
            if (!obj || typeof obj != "object") {
                return [];
            }
            var keys = [],
                values = [];
            for (var i in obj) {
                keys.push(i);
            }
            keys.sort();
            for (var i = 0; i < keys.length; i++) {
                values.push(obj[keys[i]]);
            }
            return values;
        },
        setVendorAttribute: function (el, attr, val) {
            var uc = attr.charAt(0).toUpperCase() + attr.substr(1);
            el[attr] = el["ms" + uc] = el["moz" + uc] = el["webkit" + uc] = el["o" + uc] = val;
        },
        getVendorAttribute: function (el, attr) {
            var uc = attr.charAt(0).toUpperCase() + attr.substr(1);
            return el[attr] || el["ms" + uc] || el["moz" + uc] || el["webkit" + uc] || el["o" + uc];
        },
        normalizeVendorAttribute: function (el, attr) {
            var prefixedVal = ig.getVendorAttribute(el, attr);
            if (!el[attr] && prefixedVal) {
                el[attr] = prefixedVal;
            }
        },
        getImagePixels: function (image, x, y, width, height) {
            var canvas = ig.$new("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            var ctx = canvas.getContext("2d");
            ig.System.SCALE.CRISP(canvas, ctx);
            var ratio = ig.getVendorAttribute(ctx, "backingStorePixelRatio") || 1;
            ig.normalizeVendorAttribute(ctx, "getImageDataHD");
            var realWidth = image.width / ratio,
                realHeight = image.height / ratio;
            canvas.width = Math.ceil(realWidth);
            canvas.height = Math.ceil(realHeight);
            ctx.drawImage(image, 0, 0, realWidth, realHeight);
            return ratio === 1 ? ctx.getImageData(x, y, width, height) : ctx.getImageDataHD(x, y, width, height);
        },
        module: function (name) {
            if (ig._current) {
                throw "Module '" + ig._current.name + "' defines nothing";
            }
            if (ig.modules[name] && ig.modules[name].body) {
                throw "Module '" + name + "' is already defined";
            }
            ig._current = { name: name, requires: [], loaded: false, body: null };
            ig.modules[name] = ig._current;
            ig._loadQueue.push(ig._current);
            return ig;
        },
        requires: function () {
            ig._current.requires = Array.prototype.slice.call(arguments);
            return ig;
        },
        defines: function (body) {
            ig._current.body = body;
            ig._current = null;
            ig._initDOMReady();
        },
        addResource: function (resource) {
            ig.resources.push(resource);
        },
        setNocache: function (set) {
            ig.nocache = set ? "?" + Date.now() : "";
        },
        log: function () {},
        assert: function (condition, msg) {},
        show: function (name, number) {},
        mark: function (msg, color) {},
        _loadScript: function (name, requiredFrom) {
            ig.modules[name] = { name: name, requires: [], loaded: false, body: null };
            ig._waitForOnload++;
            var path = ig.prefix + ig.lib + name.replace(/\./g, "/") + ".js" + ig.nocache;
            var script = ig.$new("script");
            script.type = "text/javascript";
            script.src = path;
            script.onload = function () {
                ig._waitForOnload--;
                ig._execModules();
            };
            script.onerror = function () {
                throw "Failed to load module " + name + " at " + path + " " + "required from " + requiredFrom;
            };
            ig.$("head")[0].appendChild(script);
        },
        _execModules: function () {
            var modulesLoaded = false;
            for (var i = 0; i < ig._loadQueue.length; i++) {
                var m = ig._loadQueue[i];
                var dependenciesLoaded = true;
                for (var j = 0; j < m.requires.length; j++) {
                    var name = m.requires[j];
                    if (!ig.modules[name]) {
                        dependenciesLoaded = false;
                        ig._loadScript(name, m.name);
                    } else if (!ig.modules[name].loaded) {
                        dependenciesLoaded = false;
                    }
                }
                if (dependenciesLoaded && m.body) {
                    ig._loadQueue.splice(i, 1);
                    m.loaded = true;
                    m.body();
                    modulesLoaded = true;
                    i--;
                }
            }
            if (modulesLoaded) {
                ig._execModules();
            } else if (!ig.baked && ig._waitForOnload == 0 && ig._loadQueue.length != 0) {
                var unresolved = [];
                for (var i = 0; i < ig._loadQueue.length; i++) {
                    var unloaded = [];
                    var requires = ig._loadQueue[i].requires;
                    for (var j = 0; j < requires.length; j++) {
                        var m = ig.modules[requires[j]];
                        if (!m || !m.loaded) {
                            unloaded.push(requires[j]);
                        }
                    }
                    unresolved.push(ig._loadQueue[i].name + " (requires: " + unloaded.join(", ") + ")");
                }
                throw "Unresolved (or circular?) dependencies. " + "Most likely there's a name/path mismatch for one of the listed modules " + "or a previous syntax error prevents a module from loading:\n" + unresolved.join("\n");
            }
        },
        _DOMReady: function () {
            if (!ig.modules["dom.ready"].loaded) {
                if (!document.body) {
                    return setTimeout(ig._DOMReady, 13);
                }
                ig.modules["dom.ready"].loaded = true;
                ig._waitForOnload--;
                ig._execModules();
            }
            return 0;
        },
        _boot: function () {
            if (document.location.href.match(/\?nocache/)) {
                ig.setNocache(true);
            }
            ig.ua.pixelRatio = window.devicePixelRatio || 1;
            ig.ua.viewport = { width: window.innerWidth, height: window.innerHeight };
            ig.ua.screen = { width: window.screen.availWidth * ig.ua.pixelRatio, height: window.screen.availHeight * ig.ua.pixelRatio };
            ig.ua.iPhone = /iPhone/i.test(navigator.userAgent);
            ig.ua.iPhone4 = ig.ua.iPhone && ig.ua.pixelRatio == 2;
            ig.ua.iPad = /iPad/i.test(navigator.userAgent);
            ig.ua.android = /android/i.test(navigator.userAgent);
            ig.ua.winPhone = /Windows Phone/i.test(navigator.userAgent);
            ig.ua.iOS = ig.ua.iPhone || ig.ua.iPad;
            ig.ua.mobile = ig.ua.iOS || ig.ua.android || ig.ua.winPhone || /mobile/i.test(navigator.userAgent);
            ig.ua.touchDevice = "ontouchstart" in window || window.navigator.msMaxTouchPoints;
        },
        _initDOMReady: function () {
            if (ig.modules["dom.ready"]) {
                ig._execModules();
                return;
            }
            ig._boot();
            ig.modules["dom.ready"] = { requires: [], loaded: false, body: null };
            ig._waitForOnload++;
            if (document.readyState === "complete") {
                ig._DOMReady();
            } else {
                document.addEventListener("DOMContentLoaded", ig._DOMReady, false);
                window.addEventListener("load", ig._DOMReady, false);
            }
        },
    };
    ig.normalizeVendorAttribute(window, "requestAnimationFrame");
    if (window.requestAnimationFrame) {
        var next = 1,
            anims = {};
        window.ig.setAnimation = function (callback, element) {
            var current = next++;
            anims[current] = true;
            var animate = function () {
                if (!anims[current]) {
                    return;
                }
                window.requestAnimationFrame(animate, element);
                callback();
            };
            window.requestAnimationFrame(animate, element);
            return current;
        };
        window.ig.clearAnimation = function (id) {
            delete anims[id];
        };
    } else {
        window.ig.setAnimation = function (callback, element) {
            return window.setInterval(callback, 1000 / 60);
        };
        window.ig.clearAnimation = function (id) {
            window.clearInterval(id);
        };
    }
    var initializing = false,
        fnTest = /xyz/.test(function () {
            xyz;
        })
            ? /\bparent\b/
            : /.*/;
    var lastClassId = 0;
    window.ig.Class = function () {};
    var inject = function (prop) {
        var proto = this.prototype;
        var parent = {};
        for (var name in prop) {
            if (typeof prop[name] == "function" && typeof proto[name] == "function" && fnTest.test(prop[name])) {
                parent[name] = proto[name];
                proto[name] = (function (name, fn) {
                    return function () {
                        var tmp = this.parent;
                        this.parent = parent[name];
                        var ret = fn.apply(this, arguments);
                        this.parent = tmp;
                        return ret;
                    };
                })(name, prop[name]);
            } else {
                proto[name] = prop[name];
            }
        }
    };
    window.ig.Class.extend = function (prop) {
        var parent = this.prototype;
        initializing = true;
        var prototype = new this();
        initializing = false;
        for (var name in prop) {
            if (typeof prop[name] == "function" && typeof parent[name] == "function" && fnTest.test(prop[name])) {
                prototype[name] = (function (name, fn) {
                    return function () {
                        var tmp = this.parent;
                        this.parent = parent[name];
                        var ret = fn.apply(this, arguments);
                        this.parent = tmp;
                        return ret;
                    };
                })(name, prop[name]);
            } else {
                prototype[name] = prop[name];
            }
        }
        function Class() {
            if (!initializing) {
                if (this.staticInstantiate) {
                    var obj = this.staticInstantiate.apply(this, arguments);
                    if (obj) {
                        return obj;
                    }
                }
                for (var p in this) {
                    if (typeof this[p] == "object") {
                        this[p] = ig.copy(this[p]);
                    }
                }
                if (this.init) {
                    this.init.apply(this, arguments);
                }
            }
            return this;
        }
        Class.prototype = prototype;
        Class.prototype.constructor = Class;
        Class.extend = window.ig.Class.extend;
        Class.inject = inject;
        Class.classId = prototype.classId = ++lastClassId;
        return Class;
    };
    if (window.ImpactMixin) {
        ig.merge(ig, window.ImpactMixin);
    }
})(window);

// lib/impact/image.js
ig.baked = true;
ig.module("impact.image").defines(function () {
    "use strict";
    ig.Image = ig.Class.extend({
        data: null,
        width: 0,
        height: 0,
        loaded: false,
        failed: false,
        loadCallback: null,
        path: "",
        staticInstantiate: function (path) {
            return ig.Image.cache[path] || null;
        },
        init: function (path) {
            this.path = path;
            this.load();
        },
        load: function (loadCallback) {
            if (this.loaded) {
                if (loadCallback) {
                    loadCallback(this.path, true);
                }
                return;
            } else if (!this.loaded && ig.ready) {
                this.loadCallback = loadCallback || null;
                this.data = new Image();
                this.data.onload = this.onload.bind(this);
                this.data.onerror = this.onerror.bind(this);
                this.data.src = ig.prefix + this.path + ig.nocache;
            } else {
                ig.addResource(this);
            }
            ig.Image.cache[this.path] = this;
        },
        reload: function () {
            this.loaded = false;
            this.data = new Image();
            this.data.onload = this.onload.bind(this);
            this.data.src = this.path + "?" + Date.now();
        },
        onload: function (event) {
            this.width = this.data.width;
            this.height = this.data.height;
            this.loaded = true;
            if (ig.system.scale != 1) {
                this.resize(ig.system.scale);
            }
            if (this.loadCallback) {
                this.loadCallback(this.path, true);
            }
        },
        onerror: function (event) {
            this.failed = true;
            if (this.loadCallback) {
                this.loadCallback(this.path, false);
            }
        },
        resize: function (scale) {
            var origPixels = ig.getImagePixels(this.data, 0, 0, this.width, this.height);
            var widthScaled = this.width * scale;
            var heightScaled = this.height * scale;
            var scaled = ig.$new("canvas");
            scaled.width = widthScaled;
            scaled.height = heightScaled;
            var scaledCtx = scaled.getContext("2d");
            var scaledPixels = scaledCtx.getImageData(0, 0, widthScaled, heightScaled);
            for (var y = 0; y < heightScaled; y++) {
                for (var x = 0; x < widthScaled; x++) {
                    var index = (Math.floor(y / scale) * this.width + Math.floor(x / scale)) * 4;
                    var indexScaled = (y * widthScaled + x) * 4;
                    scaledPixels.data[indexScaled] = origPixels.data[index];
                    scaledPixels.data[indexScaled + 1] = origPixels.data[index + 1];
                    scaledPixels.data[indexScaled + 2] = origPixels.data[index + 2];
                    scaledPixels.data[indexScaled + 3] = origPixels.data[index + 3];
                }
            }
            scaledCtx.putImageData(scaledPixels, 0, 0);
            this.data = scaled;
        },
        draw: function (targetX, targetY, sourceX, sourceY, width, height) {
            if (!this.loaded) {
                return;
            }
            var scale = ig.system.scale;
            sourceX = sourceX ? sourceX * scale : 0;
            sourceY = sourceY ? sourceY * scale : 0;
            width = (width ? width : this.width) * scale;
            height = (height ? height : this.height) * scale;
            ig.system.context.drawImage(this.data, sourceX, sourceY, width, height, ig.system.getDrawPos(targetX), ig.system.getDrawPos(targetY), width, height);
            ig.Image.drawCount++;
        },
        drawTile: function (targetX, targetY, tile, tileWidth, tileHeight, flipX, flipY) {
            tileHeight = tileHeight ? tileHeight : tileWidth;
            if (!this.loaded || tileWidth > this.width || tileHeight > this.height) {
                return;
            }
            var scale = ig.system.scale;
            var tileWidthScaled = Math.floor(tileWidth * scale);
            var tileHeightScaled = Math.floor(tileHeight * scale);
            var scaleX = flipX ? -1 : 1;
            var scaleY = flipY ? -1 : 1;
            if (flipX || flipY) {
                ig.system.context.save();
                ig.system.context.scale(scaleX, scaleY);
            }
            ig.system.context.drawImage(
                this.data,
                (Math.floor(tile * tileWidth) % this.width) * scale,
                Math.floor((tile * tileWidth) / this.width) * tileHeight * scale,
                tileWidthScaled,
                tileHeightScaled,
                ig.system.getDrawPos(targetX) * scaleX - (flipX ? tileWidthScaled : 0),
                ig.system.getDrawPos(targetY) * scaleY - (flipY ? tileHeightScaled : 0),
                tileWidthScaled,
                tileHeightScaled
            );
            if (flipX || flipY) {
                ig.system.context.restore();
            }
            ig.Image.drawCount++;
        },
    });
    ig.Image.drawCount = 0;
    ig.Image.cache = {};
    ig.Image.reloadCache = function () {
        for (var path in ig.Image.cache) {
            ig.Image.cache[path].reload();
        }
    };
});

// lib/impact/font.js
ig.baked = true;
ig.module("impact.font")
    .requires("impact.image")
    .defines(function () {
        "use strict";
        ig.Font = ig.Image.extend({
            widthMap: [],
            indices: [],
            firstChar: 32,
            alpha: 1,
            letterSpacing: 1,
            lineSpacing: 0,
            onload: function (ev) {
                this._loadMetrics(this.data);
                this.parent(ev);
            },
            widthForString: function (text) {
                if (text.indexOf("\n") !== -1) {
                    var lines = text.split("\n");
                    var width = 0;
                    for (var i = 0; i < lines.length; i++) {
                        width = Math.max(width, this._widthForLine(lines[i]));
                    }
                    return width;
                } else {
                    return this._widthForLine(text);
                }
            },
            _widthForLine: function (text) {
                var width = 0;
                for (var i = 0; i < text.length; i++) {
                    width += this.widthMap[text.charCodeAt(i) - this.firstChar] + this.letterSpacing;
                }
                return width;
            },
            heightForString: function (text) {
                return text.split("\n").length * (this.height + this.lineSpacing);
            },
            draw: function (text, x, y, align) {
                if (typeof text != "string") {
                    text = text.toString();
                }
                if (text.indexOf("\n") !== -1) {
                    var lines = text.split("\n");
                    var lineHeight = this.height + this.lineSpacing;
                    for (var i = 0; i < lines.length; i++) {
                        this.draw(lines[i], x, y + i * lineHeight, align);
                    }
                    return;
                }
                if (align == ig.Font.ALIGN.RIGHT || align == ig.Font.ALIGN.CENTER) {
                    var width = this._widthForLine(text);
                    x -= align == ig.Font.ALIGN.CENTER ? width / 2 : width;
                }
                if (this.alpha !== 1) {
                    ig.system.context.globalAlpha = this.alpha;
                }
                for (var i = 0; i < text.length; i++) {
                    var c = text.charCodeAt(i);
                    x += this._drawChar(c - this.firstChar, x, y);
                }
                if (this.alpha !== 1) {
                    ig.system.context.globalAlpha = 1;
                }
                ig.Image.drawCount += text.length;
            },
            _drawChar: function (c, targetX, targetY) {
                if (!this.loaded || c < 0 || c >= this.indices.length) {
                    return 0;
                }
                var scale = ig.system.scale;
                var charX = this.indices[c] * scale;
                var charY = 0;
                var charWidth = this.widthMap[c] * scale;
                var charHeight = (this.height - 2) * scale;
                ig.system.context.drawImage(this.data, charX, charY, charWidth, charHeight, ig.system.getDrawPos(targetX), ig.system.getDrawPos(targetY), charWidth, charHeight);
                return this.widthMap[c] + this.letterSpacing;
            },
            _loadMetrics: function (image) {
                this.height = image.height - 1;
                this.widthMap = [];
                this.indices = [];
                var px = ig.getImagePixels(image, 0, image.height - 1, image.width, 1);
                var currentChar = 0;
                var currentWidth = 0;
                for (var x = 0; x < image.width; x++) {
                    var index = x * 4 + 3;
                    if (px.data[index] > 127) {
                        currentWidth++;
                    } else if (px.data[index] < 128 && currentWidth) {
                        this.widthMap.push(currentWidth);
                        this.indices.push(x - currentWidth);
                        currentChar++;
                        currentWidth = 0;
                    }
                }
                this.widthMap.push(currentWidth);
                this.indices.push(x - currentWidth);
            },
        });
        ig.Font.ALIGN = { LEFT: 0, RIGHT: 1, CENTER: 2 };
    });

// lib/impact/sound.js
ig.baked = true;
ig.module("impact.sound").defines(function () {
    "use strict";
    ig.SoundManager = ig.Class.extend({
        clips: {},
        volume: 1,
        format: null,
        init: function () {
            if (!ig.Sound.enabled || !window.Audio) {
                ig.Sound.enabled = false;
                return;
            }
            var probe = new Audio();
            for (var i = 0; i < ig.Sound.use.length; i++) {
                var format = ig.Sound.use[i];
                if (probe.canPlayType(format.mime)) {
                    this.format = format;
                    break;
                }
            }
            if (!this.format) {
                ig.Sound.enabled = false;
            }
        },
        load: function (path, multiChannel, loadCallback) {
            var realPath = ig.prefix + path.replace(/[^\.]+$/, this.format.ext) + ig.nocache;
            if (this.clips[path]) {
                if (multiChannel && this.clips[path].length < ig.Sound.channels) {
                    for (var i = this.clips[path].length; i < ig.Sound.channels; i++) {
                        var a = new Audio(realPath);
                        a.load();
                        this.clips[path].push(a);
                    }
                }
                return this.clips[path][0];
            }
            var clip = new Audio(realPath);
            if (loadCallback) {
                clip.addEventListener(
                    "canplaythrough",
                    function cb(ev) {
                        clip.removeEventListener("canplaythrough", cb, false);
                        loadCallback(path, true, ev);
                    },
                    false
                );
                clip.addEventListener(
                    "error",
                    function (ev) {
                        loadCallback(path, false, ev);
                    },
                    false
                );
            }
            clip.preload = "auto";
            clip.load();
            this.clips[path] = [clip];
            if (multiChannel) {
                for (var i = 1; i < ig.Sound.channels; i++) {
                    var a = new Audio(realPath);
                    a.load();
                    this.clips[path].push(a);
                }
            }
            return clip;
        },
        get: function (path) {
            var channels = this.clips[path];
            for (var i = 0, clip; (clip = channels[i++]); ) {
                if (clip.paused || clip.ended) {
                    if (clip.ended) {
                        clip.currentTime = 0;
                    }
                    return clip;
                }
            }
            channels[0].pause();
            channels[0].currentTime = 0;
            return channels[0];
        },
    });
    ig.Music = ig.Class.extend({
        tracks: [],
        namedTracks: {},
        currentTrack: null,
        currentIndex: 0,
        random: false,
        _volume: 1,
        _loop: false,
        _fadeInterval: 0,
        _fadeTimer: null,
        _endedCallbackBound: null,
        init: function () {
            this._endedCallbackBound = this._endedCallback.bind(this);
            if (Object.defineProperty) {
                Object.defineProperty(this, "volume", { get: this.getVolume.bind(this), set: this.setVolume.bind(this) });
                Object.defineProperty(this, "loop", { get: this.getLooping.bind(this), set: this.setLooping.bind(this) });
            } else if (this.__defineGetter__) {
                this.__defineGetter__("volume", this.getVolume.bind(this));
                this.__defineSetter__("volume", this.setVolume.bind(this));
                this.__defineGetter__("loop", this.getLooping.bind(this));
                this.__defineSetter__("loop", this.setLooping.bind(this));
            }
        },
        add: function (music, name) {
            if (!ig.Sound.enabled) {
                return;
            }
            var path = music instanceof ig.Sound ? music.path : music;
            var track = ig.soundManager.load(path, false);
            track.loop = this._loop;
            track.volume = this._volume;
            track.addEventListener("ended", this._endedCallbackBound, false);
            this.tracks.push(track);
            if (name) {
                this.namedTracks[name] = track;
            }
            if (!this.currentTrack) {
                this.currentTrack = track;
            }
        },
        next: function () {
            if (!this.tracks.length) {
                return;
            }
            this.stop();
            this.currentIndex = this.random ? Math.floor(Math.random() * this.tracks.length) : (this.currentIndex + 1) % this.tracks.length;
            this.currentTrack = this.tracks[this.currentIndex];
            this.play();
        },
        pause: function () {
            if (!this.currentTrack) {
                return;
            }
            this.currentTrack.pause();
        },
        stop: function () {
            if (!this.currentTrack) {
                return;
            }
            this.currentTrack.pause();
            this.currentTrack.currentTime = 0;
        },
        play: function (name) {
            if (name && this.namedTracks[name]) {
                var newTrack = this.namedTracks[name];
                if (newTrack != this.currentTrack) {
                    this.stop();
                    this.currentTrack = newTrack;
                }
            } else if (!this.currentTrack) {
                return;
            }
            this.currentTrack.play();
        },
        getLooping: function () {
            return this._loop;
        },
        setLooping: function (l) {
            this._loop = l;
            for (var i in this.tracks) {
                this.tracks[i].loop = l;
            }
        },
        getVolume: function () {
            return this._volume;
        },
        setVolume: function (v) {
            this._volume = v.limit(0, 1);
            for (var i in this.tracks) {
                this.tracks[i].volume = this._volume;
            }
        },
        fadeOut: function (time) {
            if (!this.currentTrack) {
                return;
            }
            clearInterval(this._fadeInterval);
            this.fadeTimer = new ig.Timer(time);
            this._fadeInterval = setInterval(this._fadeStep.bind(this), 50);
        },
        _fadeStep: function () {
            var v = this.fadeTimer.delta().map(-this.fadeTimer.target, 0, 1, 0).limit(0, 1) * this._volume;
            if (v <= 0.01) {
                this.stop();
                this.currentTrack.volume = this._volume;
                clearInterval(this._fadeInterval);
            } else {
                this.currentTrack.volume = v;
            }
        },
        _endedCallback: function () {
            if (this._loop) {
                this.play();
            } else {
                this.next();
            }
        },
    });
    ig.Sound = ig.Class.extend({
        path: "",
        volume: 1,
        currentClip: null,
        multiChannel: true,
        init: function (path, multiChannel) {
            this.path = path;
            this.multiChannel = multiChannel !== false;
            this.load();
        },
        load: function (loadCallback) {
            if (!ig.Sound.enabled) {
                if (loadCallback) {
                    loadCallback(this.path, true);
                }
                return;
            }
            if (ig.ready) {
                ig.soundManager.load(this.path, this.multiChannel, loadCallback);
            } else {
                ig.addResource(this);
            }
        },
        play: function () {
            if (!ig.Sound.enabled) {
                return;
            }
            this.currentClip = ig.soundManager.get(this.path);
            this.currentClip.volume = ig.soundManager.volume * this.volume;
            this.currentClip.play();
        },
        stop: function () {
            if (this.currentClip) {
                this.currentClip.pause();
                this.currentClip.currentTime = 0;
            }
        },
    });
    ig.Sound.FORMAT = {
        MP3: { ext: "mp3", mime: "audio/mpeg" },
        M4A: { ext: "m4a", mime: "audio/mp4; codecs=mp4a" },
        OGG: { ext: "ogg", mime: "audio/ogg; codecs=vorbis" },
        WEBM: { ext: "webm", mime: "audio/webm; codecs=vorbis" },
        CAF: { ext: "caf", mime: "audio/x-caf" },
    };
    ig.Sound.use = [ig.Sound.FORMAT.OGG, ig.Sound.FORMAT.MP3];
    ig.Sound.channels = 4;
    ig.Sound.enabled = true;
});

// lib/impact/loader.js
ig.baked = true;
ig.module("impact.loader")
    .requires("impact.image", "impact.font", "impact.sound")
    .defines(function () {
        "use strict";
        ig.Loader = ig.Class.extend({
            resources: [],
            gameClass: null,
            status: 0,
            done: false,
            _unloaded: [],
            _drawStatus: 0,
            _intervalId: 0,
            _loadCallbackBound: null,
            init: function (gameClass, resources) {
                this.gameClass = gameClass;
                this.resources = resources;
                this._loadCallbackBound = this._loadCallback.bind(this);
                for (var i = 0; i < this.resources.length; i++) {
                    this._unloaded.push(this.resources[i].path);
                }
            },
            load: function () {
                ig.system.clear("#000");
                if (!this.resources.length) {
                    this.end();
                    return;
                }
                for (var i = 0; i < this.resources.length; i++) {
                    this.loadResource(this.resources[i]);
                }
                this._intervalId = setInterval(this.draw.bind(this), 16);
            },
            loadResource: function (res) {
                res.load(this._loadCallbackBound);
            },
            end: function () {
                if (this.done) {
                    return;
                }
                this.done = true;
                clearInterval(this._intervalId);
                ig.system.setGame(this.gameClass);
            },
            draw: function () {
                this._drawStatus += (this.status - this._drawStatus) / 5;
                var s = ig.system.scale;
                var w = ig.system.width * 0.6;
                var h = ig.system.height * 0.1;
                var x = ig.system.width * 0.5 - w / 2;
                var y = ig.system.height * 0.5 - h / 2;
                ig.system.context.fillStyle = "#000";
                ig.system.context.fillRect(0, 0, 480, 320);
                ig.system.context.fillStyle = "#fff";
                ig.system.context.fillRect(x * s, y * s, w * s, h * s);
                ig.system.context.fillStyle = "#000";
                ig.system.context.fillRect(x * s + s, y * s + s, w * s - s - s, h * s - s - s);
                ig.system.context.fillStyle = "#fff";
                ig.system.context.fillRect(x * s, y * s, w * s * this._drawStatus, h * s);
            },
            _loadCallback: function (path, status) {
                if (status) {
                    this._unloaded.erase(path);
                } else {
                    throw "Failed to load resource: " + path;
                }
                this.status = 1 - this._unloaded.length / this.resources.length;
                if (this._unloaded.length == 0) {
                    setTimeout(this.end.bind(this), 250);
                }
            },
        });
    });

// lib/impact/timer.js
ig.baked = true;
ig.module("impact.timer").defines(function () {
    "use strict";
    ig.Timer = ig.Class.extend({
        target: 0,
        base: 0,
        last: 0,
        pausedAt: 0,
        init: function (seconds) {
            this.base = ig.Timer.time;
            this.last = ig.Timer.time;
            this.target = seconds || 0;
        },
        set: function (seconds) {
            this.target = seconds || 0;
            this.base = ig.Timer.time;
            this.pausedAt = 0;
        },
        reset: function () {
            this.base = ig.Timer.time;
            this.pausedAt = 0;
        },
        tick: function () {
            var delta = ig.Timer.time - this.last;
            this.last = ig.Timer.time;
            return this.pausedAt ? 0 : delta;
        },
        delta: function () {
            return (this.pausedAt || ig.Timer.time) - this.base - this.target;
        },
        pause: function () {
            if (!this.pausedAt) {
                this.pausedAt = ig.Timer.time;
            }
        },
        unpause: function () {
            if (this.pausedAt) {
                this.base += ig.Timer.time - this.pausedAt;
                this.pausedAt = 0;
            }
        },
    });
    ig.Timer._last = 0;
    ig.Timer.time = Number.MIN_VALUE;
    ig.Timer.timeScale = 1;
    ig.Timer.maxStep = 0.05;
    ig.Timer.step = function () {
        var current = Date.now();
        var delta = (current - ig.Timer._last) / 1000;
        ig.Timer.time += Math.min(delta, ig.Timer.maxStep) * ig.Timer.timeScale;
        ig.Timer._last = current;
    };
});

// lib/impact/system.js
ig.baked = true;
ig.module("impact.system")
    .requires("impact.timer", "impact.image")
    .defines(function () {
        "use strict";
        ig.System = ig.Class.extend({
            fps: 30,
            width: 320,
            height: 240,
            realWidth: 320,
            realHeight: 240,
            scale: 1,
            tick: 0,
            animationId: 0,
            newGameClass: null,
            running: false,
            delegate: null,
            clock: null,
            canvas: null,
            context: null,
            init: function (canvasId, fps, width, height, scale) {
                this.fps = fps;
                this.clock = new ig.Timer();
                this.canvas = ig.$(canvasId);
                this.resize(width, height, scale);
                this.context = this.canvas.getContext("2d");
                this.getDrawPos = ig.System.drawMode;
                if (this.scale != 1) {
                    ig.System.scaleMode = ig.System.SCALE.CRISP;
                }
                ig.System.scaleMode(this.canvas, this.context);
            },
            resize: function (width, height, scale) {
                this.width = width;
                this.height = height;
                this.scale = scale || this.scale;
                this.realWidth = this.width * this.scale;
                this.realHeight = this.height * this.scale;
                this.canvas.width = this.realWidth;
                this.canvas.height = this.realHeight;
            },
            setGame: function (gameClass) {
                if (this.running) {
                    this.newGameClass = gameClass;
                } else {
                    this.setGameNow(gameClass);
                }
            },
            setGameNow: function (gameClass) {
                ig.game = new gameClass();
                ig.system.setDelegate(ig.game);
            },
            setDelegate: function (object) {
                if (typeof object.run == "function") {
                    this.delegate = object;
                    this.startRunLoop();
                } else {
                    throw "System.setDelegate: No run() function in object";
                }
            },
            stopRunLoop: function () {
                ig.clearAnimation(this.animationId);
                this.running = false;
            },
            startRunLoop: function () {
                this.stopRunLoop();
                this.animationId = ig.setAnimation(this.run.bind(this), this.canvas);
                this.running = true;
            },
            clear: function (color) {
                this.context.fillStyle = color;
                this.context.fillRect(0, 0, this.realWidth, this.realHeight);
            },
            run: function () {
                ig.Timer.step();
                this.tick = this.clock.tick();
                this.delegate.run();
                ig.input.clearPressed();
                if (this.newGameClass) {
                    this.setGameNow(this.newGameClass);
                    this.newGameClass = null;
                }
            },
            getDrawPos: null,
        });
        ig.System.DRAW = {
            AUTHENTIC: function (p) {
                return Math.round(p) * this.scale;
            },
            SMOOTH: function (p) {
                return Math.round(p * this.scale);
            },
            SUBPIXEL: function (p) {
                return p * this.scale;
            },
        };
        ig.System.drawMode = ig.System.DRAW.SMOOTH;
        ig.System.SCALE = {
            CRISP: function (canvas, context) {
                ig.setVendorAttribute(context, "imageSmoothingEnabled", false);
                canvas.style.imageRendering = "-moz-crisp-edges";
                canvas.style.imageRendering = "-o-crisp-edges";
                canvas.style.imageRendering = "-webkit-optimize-contrast";
                canvas.style.imageRendering = "crisp-edges";
                canvas.style.msInterpolationMode = "nearest-neighbor";
            },
            SMOOTH: function (canvas, context) {
                ig.setVendorAttribute(context, "imageSmoothingEnabled", true);
                canvas.style.imageRendering = "";
                canvas.style.msInterpolationMode = "";
            },
        };
        ig.System.scaleMode = ig.System.SCALE.SMOOTH;
    });

// lib/impact/input.js
ig.baked = true;
ig.module("impact.input").defines(function () {
    "use strict";
    ig.KEY = {
        MOUSE1: -1,
        MOUSE2: -3,
        MWHEEL_UP: -4,
        MWHEEL_DOWN: -5,
        BACKSPACE: 8,
        TAB: 9,
        ENTER: 13,
        PAUSE: 19,
        CAPS: 20,
        ESC: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT_ARROW: 37,
        UP_ARROW: 38,
        RIGHT_ARROW: 39,
        DOWN_ARROW: 40,
        INSERT: 45,
        DELETE: 46,
        _0: 48,
        _1: 49,
        _2: 50,
        _3: 51,
        _4: 52,
        _5: 53,
        _6: 54,
        _7: 55,
        _8: 56,
        _9: 57,
        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,
        NUMPAD_0: 96,
        NUMPAD_1: 97,
        NUMPAD_2: 98,
        NUMPAD_3: 99,
        NUMPAD_4: 100,
        NUMPAD_5: 101,
        NUMPAD_6: 102,
        NUMPAD_7: 103,
        NUMPAD_8: 104,
        NUMPAD_9: 105,
        MULTIPLY: 106,
        ADD: 107,
        SUBSTRACT: 109,
        DECIMAL: 110,
        DIVIDE: 111,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        PLUS: 187,
        COMMA: 188,
        MINUS: 189,
        PERIOD: 190,
    };
    ig.Input = ig.Class.extend({
        bindings: {},
        actions: {},
        presses: {},
        locks: {},
        delayedKeyup: {},
        isUsingMouse: false,
        isUsingKeyboard: false,
        isUsingAccelerometer: false,
        mouse: { x: 0, y: 0 },
        accel: { x: 0, y: 0, z: 0 },
        initMouse: function () {
            if (this.isUsingMouse) {
                return;
            }
            this.isUsingMouse = true;
            var mouseWheelBound = this.mousewheel.bind(this);
            ig.system.canvas.addEventListener("mousewheel", mouseWheelBound, false);
            ig.system.canvas.addEventListener("DOMMouseScroll", mouseWheelBound, false);
            ig.system.canvas.addEventListener("contextmenu", this.contextmenu.bind(this), false);
            ig.system.canvas.addEventListener("mousedown", this.keydown.bind(this), false);
            ig.system.canvas.addEventListener("mouseup", this.keyup.bind(this), false);
            ig.system.canvas.addEventListener("mousemove", this.mousemove.bind(this), false);
            if (ig.ua.touchDevice) {
                ig.system.canvas.addEventListener("touchstart", this.keydown.bind(this), false);
                ig.system.canvas.addEventListener("touchend", this.keyup.bind(this), false);
                ig.system.canvas.addEventListener("touchmove", this.mousemove.bind(this), false);
                ig.system.canvas.addEventListener("MSPointerDown", this.keydown.bind(this), false);
                ig.system.canvas.addEventListener("MSPointerUp", this.keyup.bind(this), false);
                ig.system.canvas.addEventListener("MSPointerMove", this.mousemove.bind(this), false);
                ig.system.canvas.style.msTouchAction = "none";
            }
        },
        initKeyboard: function () {
            if (this.isUsingKeyboard) {
                return;
            }
            this.isUsingKeyboard = true;
            window.addEventListener("keydown", this.keydown.bind(this), false);
            window.addEventListener("keyup", this.keyup.bind(this), false);
        },
        initAccelerometer: function () {
            if (this.isUsingAccelerometer) {
                return;
            }
            window.addEventListener("devicemotion", this.devicemotion.bind(this), false);
        },
        mousewheel: function (event) {
            var delta = event.wheelDelta ? event.wheelDelta : event.detail * -1;
            var code = delta > 0 ? ig.KEY.MWHEEL_UP : ig.KEY.MWHEEL_DOWN;
            var action = this.bindings[code];
            if (action) {
                this.actions[action] = true;
                this.presses[action] = true;
                this.delayedKeyup[action] = true;
                event.stopPropagation();
                event.preventDefault();
            }
        },
        mousemove: function (event) {
            var internalWidth = parseInt(ig.system.canvas.offsetWidth) || ig.system.realWidth;
            var scale = ig.system.scale * (internalWidth / ig.system.realWidth);
            var pos = { left: 0, top: 0 };
            if (ig.system.canvas.getBoundingClientRect) {
                pos = ig.system.canvas.getBoundingClientRect();
            }
            var ev = event.touches ? event.touches[0] : event;
            this.mouse.x = (ev.clientX - pos.left) / scale;
            this.mouse.y = (ev.clientY - pos.top) / scale;
        },
        contextmenu: function (event) {
            if (this.bindings[ig.KEY.MOUSE2]) {
                event.stopPropagation();
                event.preventDefault();
            }
        },
        keydown: function (event) {
            var tag = event.target.tagName;
            if (tag == "INPUT" || tag == "TEXTAREA") {
                return;
            }
            var code = event.type == "keydown" ? event.keyCode : event.button == 2 ? ig.KEY.MOUSE2 : ig.KEY.MOUSE1;
            if (event.type == "touchstart" || event.type == "mousedown") {
                this.mousemove(event);
            }
            var action = this.bindings[code];
            if (action) {
                this.actions[action] = true;
                if (!this.locks[action]) {
                    this.presses[action] = true;
                    this.locks[action] = true;
                }
                event.stopPropagation();
                event.preventDefault();
            }
        },
        keyup: function (event) {
            var tag = event.target.tagName;
            if (tag == "INPUT" || tag == "TEXTAREA") {
                return;
            }
            var code = event.type == "keyup" ? event.keyCode : event.button == 2 ? ig.KEY.MOUSE2 : ig.KEY.MOUSE1;
            var action = this.bindings[code];
            if (action) {
                this.delayedKeyup[action] = true;
                event.stopPropagation();
                event.preventDefault();
            }
        },
        devicemotion: function (event) {
            this.accel = event.accelerationIncludingGravity;
        },
        bind: function (key, action) {
            if (key < 0) {
                this.initMouse();
            } else if (key > 0) {
                this.initKeyboard();
            }
            this.bindings[key] = action;
        },
        bindTouch: function (selector, action) {
            var element = ig.$(selector);
            var that = this;
            element.addEventListener(
                "touchstart",
                function (ev) {
                    that.touchStart(ev, action);
                },
                false
            );
            element.addEventListener(
                "touchend",
                function (ev) {
                    that.touchEnd(ev, action);
                },
                false
            );
            element.addEventListener(
                "MSPointerDown",
                function (ev) {
                    that.touchStart(ev, action);
                },
                false
            );
            element.addEventListener(
                "MSPointerUp",
                function (ev) {
                    that.touchEnd(ev, action);
                },
                false
            );
        },
        unbind: function (key) {
            var action = this.bindings[key];
            this.delayedKeyup[action] = true;
            this.bindings[key] = null;
        },
        unbindAll: function () {
            this.bindings = {};
            this.actions = {};
            this.presses = {};
            this.locks = {};
            this.delayedKeyup = {};
        },
        state: function (action) {
            return this.actions[action];
        },
        pressed: function (action) {
            return this.presses[action];
        },
        released: function (action) {
            return !!this.delayedKeyup[action];
        },
        clearPressed: function () {
            for (var action in this.delayedKeyup) {
                this.actions[action] = false;
                this.locks[action] = false;
            }
            this.delayedKeyup = {};
            this.presses = {};
        },
        touchStart: function (event, action) {
            this.actions[action] = true;
            this.presses[action] = true;
            event.stopPropagation();
            event.preventDefault();
            return false;
        },
        touchEnd: function (event, action) {
            this.delayedKeyup[action] = true;
            event.stopPropagation();
            event.preventDefault();
            return false;
        },
    });
});

// lib/impact/impact.js
ig.baked = true;
ig.module("impact.impact")
    .requires("dom.ready", "impact.loader", "impact.system", "impact.input", "impact.sound")
    .defines(function () {
        "use strict";
        ig.main = function (canvasId, gameClass, fps, width, height, scale, loaderClass) {
            ig.system = new ig.System(canvasId, fps, width, height, scale || 1);
            ig.input = new ig.Input();
            ig.soundManager = new ig.SoundManager();
            ig.music = new ig.Music();
            ig.ready = true;
            var loader = new (loaderClass || ig.Loader)(gameClass, ig.resources);
            loader.load();
        };
    });

// lib/impact/animation.js
ig.baked = true;
ig.module("impact.animation")
    .requires("impact.timer", "impact.image")
    .defines(function () {
        "use strict";
        ig.AnimationSheet = ig.Class.extend({
            width: 8,
            height: 8,
            image: null,
            init: function (path, width, height) {
                this.width = width;
                this.height = height;
                this.image = new ig.Image(path);
            },
        });
        ig.Animation = ig.Class.extend({
            sheet: null,
            timer: null,
            sequence: [],
            flip: { x: false, y: false },
            pivot: { x: 0, y: 0 },
            frame: 0,
            tile: 0,
            loopCount: 0,
            alpha: 1,
            angle: 0,
            init: function (sheet, frameTime, sequence, stop) {
                this.sheet = sheet;
                this.pivot = { x: sheet.width / 2, y: sheet.height / 2 };
                this.timer = new ig.Timer();
                this.frameTime = frameTime;
                this.sequence = sequence;
                this.stop = !!stop;
                this.tile = this.sequence[0];
            },
            rewind: function () {
                this.timer.set();
                this.loopCount = 0;
                this.frame = 0;
                this.tile = this.sequence[0];
                return this;
            },
            gotoFrame: function (f) {
                this.timer.set(this.frameTime * -f - 0.0001);
                this.update();
            },
            gotoRandomFrame: function () {
                this.gotoFrame(Math.floor(Math.random() * this.sequence.length));
            },
            update: function () {
                var frameTotal = Math.floor(this.timer.delta() / this.frameTime);
                this.loopCount = Math.floor(frameTotal / this.sequence.length);
                if (this.stop && this.loopCount > 0) {
                    this.frame = this.sequence.length - 1;
                } else {
                    this.frame = frameTotal % this.sequence.length;
                }
                this.tile = this.sequence[this.frame];
            },
            draw: function (targetX, targetY) {
                var bbsize = Math.max(this.sheet.width, this.sheet.height);
                if (targetX > ig.system.width || targetY > ig.system.height || targetX + bbsize < 0 || targetY + bbsize < 0) {
                    return;
                }
                if (this.alpha != 1) {
                    ig.system.context.globalAlpha = this.alpha;
                }
                if (this.angle == 0) {
                    this.sheet.image.drawTile(targetX, targetY, this.tile, this.sheet.width, this.sheet.height, this.flip.x, this.flip.y);
                } else {
                    ig.system.context.save();
                    ig.system.context.translate(ig.system.getDrawPos(targetX + this.pivot.x), ig.system.getDrawPos(targetY + this.pivot.y));
                    ig.system.context.rotate(this.angle);
                    this.sheet.image.drawTile(-this.pivot.x, -this.pivot.y, this.tile, this.sheet.width, this.sheet.height, this.flip.x, this.flip.y);
                    ig.system.context.restore();
                }
                if (this.alpha != 1) {
                    ig.system.context.globalAlpha = 1;
                }
            },
        });
    });

// lib/impact/entity.js
ig.baked = true;
ig.module("impact.entity")
    .requires("impact.animation", "impact.impact")
    .defines(function () {
        "use strict";
        ig.Entity = ig.Class.extend({
            id: 0,
            settings: {},
            size: { x: 16, y: 16 },
            offset: { x: 0, y: 0 },
            pos: { x: 0, y: 0 },
            last: { x: 0, y: 0 },
            vel: { x: 0, y: 0 },
            accel: { x: 0, y: 0 },
            friction: { x: 0, y: 0 },
            maxVel: { x: 100, y: 100 },
            zIndex: 0,
            gravityFactor: 1,
            standing: false,
            bounciness: 0,
            minBounceVelocity: 40,
            anims: {},
            animSheet: null,
            currentAnim: null,
            health: 10,
            type: 0,
            checkAgainst: 0,
            collides: 0,
            _killed: false,
            slopeStanding: { min: (44).toRad(), max: (136).toRad() },
            init: function (x, y, settings) {
                this.id = ++ig.Entity._lastId;
                this.pos.x = this.last.x = x;
                this.pos.y = this.last.y = y;
                ig.merge(this, settings);
            },
            reset: function (x, y, settings) {
                var proto = this.constructor.prototype;
                this.pos.x = x;
                this.pos.y = y;
                this.last.x = x;
                this.last.y = y;
                this.vel.x = proto.vel.x;
                this.vel.y = proto.vel.y;
                this.accel.x = proto.accel.x;
                this.accel.y = proto.accel.y;
                this.health = proto.health;
                this._killed = proto._killed;
                this.standing = proto.standing;
                this.type = proto.type;
                this.checkAgainst = proto.checkAgainst;
                this.collides = proto.collides;
                ig.merge(this, settings);
            },
            addAnim: function (name, frameTime, sequence, stop) {
                if (!this.animSheet) {
                    throw "No animSheet to add the animation " + name + " to.";
                }
                var a = new ig.Animation(this.animSheet, frameTime, sequence, stop);
                this.anims[name] = a;
                if (!this.currentAnim) {
                    this.currentAnim = a;
                }
                return a;
            },
            update: function () {
                this.last.x = this.pos.x;
                this.last.y = this.pos.y;
                this.vel.y += ig.game.gravity * ig.system.tick * this.gravityFactor;
                this.vel.x = this.getNewVelocity(this.vel.x, this.accel.x, this.friction.x, this.maxVel.x);
                this.vel.y = this.getNewVelocity(this.vel.y, this.accel.y, this.friction.y, this.maxVel.y);
                var mx = this.vel.x * ig.system.tick;
                var my = this.vel.y * ig.system.tick;
                var res = ig.game.collisionMap.trace(this.pos.x, this.pos.y, mx, my, this.size.x, this.size.y);
                this.handleMovementTrace(res);
                if (this.currentAnim) {
                    this.currentAnim.update();
                }
            },
            getNewVelocity: function (vel, accel, friction, max) {
                if (accel) {
                    return (vel + accel * ig.system.tick).limit(-max, max);
                } else if (friction) {
                    var delta = friction * ig.system.tick;
                    if (vel - delta > 0) {
                        return vel - delta;
                    } else if (vel + delta < 0) {
                        return vel + delta;
                    } else {
                        return 0;
                    }
                }
                return vel.limit(-max, max);
            },
            handleMovementTrace: function (res) {
                this.standing = false;
                if (res.collision.y) {
                    if (this.bounciness > 0 && Math.abs(this.vel.y) > this.minBounceVelocity) {
                        this.vel.y *= -this.bounciness;
                    } else {
                        if (this.vel.y > 0) {
                            this.standing = true;
                        }
                        this.vel.y = 0;
                    }
                }
                if (res.collision.x) {
                    if (this.bounciness > 0 && Math.abs(this.vel.x) > this.minBounceVelocity) {
                        this.vel.x *= -this.bounciness;
                    } else {
                        this.vel.x = 0;
                    }
                }
                if (res.collision.slope) {
                    var s = res.collision.slope;
                    if (this.bounciness > 0) {
                        var proj = this.vel.x * s.nx + this.vel.y * s.ny;
                        this.vel.x = (this.vel.x - s.nx * proj * 2) * this.bounciness;
                        this.vel.y = (this.vel.y - s.ny * proj * 2) * this.bounciness;
                    } else {
                        var lengthSquared = s.x * s.x + s.y * s.y;
                        var dot = (this.vel.x * s.x + this.vel.y * s.y) / lengthSquared;
                        this.vel.x = s.x * dot;
                        this.vel.y = s.y * dot;
                        var angle = Math.atan2(s.x, s.y);
                        if (angle > this.slopeStanding.min && angle < this.slopeStanding.max) {
                            this.standing = true;
                        }
                    }
                }
                this.pos = res.pos;
            },
            draw: function () {
                if (this.currentAnim) {
                    this.currentAnim.draw(this.pos.x - this.offset.x - ig.game._rscreen.x, this.pos.y - this.offset.y - ig.game._rscreen.y);
                }
            },
            kill: function () {
                ig.game.removeEntity(this);
            },
            receiveDamage: function (amount, from) {
                this.health -= amount;
                if (this.health <= 0) {
                    this.kill();
                }
            },
            touches: function (other) {
                return !(this.pos.x >= other.pos.x + other.size.x || this.pos.x + this.size.x <= other.pos.x || this.pos.y >= other.pos.y + other.size.y || this.pos.y + this.size.y <= other.pos.y);
            },
            distanceTo: function (other) {
                var xd = this.pos.x + this.size.x / 2 - (other.pos.x + other.size.x / 2);
                var yd = this.pos.y + this.size.y / 2 - (other.pos.y + other.size.y / 2);
                return Math.sqrt(xd * xd + yd * yd);
            },
            angleTo: function (other) {
                return Math.atan2(other.pos.y + other.size.y / 2 - (this.pos.y + this.size.y / 2), other.pos.x + other.size.x / 2 - (this.pos.x + this.size.x / 2));
            },
            check: function (other) {},
            collideWith: function (other, axis) {},
            ready: function () {},
            erase: function () {},
        });
        ig.Entity._lastId = 0;
        ig.Entity.COLLIDES = { NEVER: 0, LITE: 1, PASSIVE: 2, ACTIVE: 4, FIXED: 8 };
        ig.Entity.TYPE = { NONE: 0, A: 1, B: 2, BOTH: 3 };
        ig.Entity.checkPair = function (a, b) {
            if (a.checkAgainst & b.type) {
                a.check(b);
            }
            if (b.checkAgainst & a.type) {
                b.check(a);
            }
            if (a.collides && b.collides && a.collides + b.collides > ig.Entity.COLLIDES.ACTIVE) {
                ig.Entity.solveCollision(a, b);
            }
        };
        ig.Entity.solveCollision = function (a, b) {
            var weak = null;
            if (a.collides == ig.Entity.COLLIDES.LITE || b.collides == ig.Entity.COLLIDES.FIXED) {
                weak = a;
            } else if (b.collides == ig.Entity.COLLIDES.LITE || a.collides == ig.Entity.COLLIDES.FIXED) {
                weak = b;
            }
            if (a.last.x + a.size.x > b.last.x && a.last.x < b.last.x + b.size.x) {
                if (a.last.y < b.last.y) {
                    ig.Entity.seperateOnYAxis(a, b, weak);
                } else {
                    ig.Entity.seperateOnYAxis(b, a, weak);
                }
                a.collideWith(b, "y");
                b.collideWith(a, "y");
            } else if (a.last.y + a.size.y > b.last.y && a.last.y < b.last.y + b.size.y) {
                if (a.last.x < b.last.x) {
                    ig.Entity.seperateOnXAxis(a, b, weak);
                } else {
                    ig.Entity.seperateOnXAxis(b, a, weak);
                }
                a.collideWith(b, "x");
                b.collideWith(a, "x");
            }
        };
        ig.Entity.seperateOnXAxis = function (left, right, weak) {
            var nudge = left.pos.x + left.size.x - right.pos.x;
            if (weak) {
                var strong = left === weak ? right : left;
                weak.vel.x = -weak.vel.x * weak.bounciness + strong.vel.x;
                var resWeak = ig.game.collisionMap.trace(weak.pos.x, weak.pos.y, weak == left ? -nudge : nudge, 0, weak.size.x, weak.size.y);
                weak.pos.x = resWeak.pos.x;
            } else {
                var v2 = (left.vel.x - right.vel.x) / 2;
                left.vel.x = -v2;
                right.vel.x = v2;
                var resLeft = ig.game.collisionMap.trace(left.pos.x, left.pos.y, -nudge / 2, 0, left.size.x, left.size.y);
                left.pos.x = Math.floor(resLeft.pos.x);
                var resRight = ig.game.collisionMap.trace(right.pos.x, right.pos.y, nudge / 2, 0, right.size.x, right.size.y);
                right.pos.x = Math.ceil(resRight.pos.x);
            }
        };
        ig.Entity.seperateOnYAxis = function (top, bottom, weak) {
            var nudge = top.pos.y + top.size.y - bottom.pos.y;
            if (weak) {
                var strong = top === weak ? bottom : top;
                weak.vel.y = -weak.vel.y * weak.bounciness + strong.vel.y;
                var nudgeX = 0;
                if (weak == top && Math.abs(weak.vel.y - strong.vel.y) < weak.minBounceVelocity) {
                    weak.standing = true;
                    nudgeX = strong.vel.x * ig.system.tick;
                }
                var resWeak = ig.game.collisionMap.trace(weak.pos.x, weak.pos.y, nudgeX, weak == top ? -nudge : nudge, weak.size.x, weak.size.y);
                weak.pos.y = resWeak.pos.y;
                weak.pos.x = resWeak.pos.x;
            } else if (ig.game.gravity && (bottom.standing || top.vel.y > 0)) {
                var resTop = ig.game.collisionMap.trace(top.pos.x, top.pos.y, 0, -(top.pos.y + top.size.y - bottom.pos.y), top.size.x, top.size.y);
                top.pos.y = resTop.pos.y;
                if (top.bounciness > 0 && top.vel.y > top.minBounceVelocity) {
                    top.vel.y *= -top.bounciness;
                } else {
                    top.standing = true;
                    top.vel.y = 0;
                }
            } else {
                var v2 = (top.vel.y - bottom.vel.y) / 2;
                top.vel.y = -v2;
                bottom.vel.y = v2;
                var nudgeX = bottom.vel.x * ig.system.tick;
                var resTop = ig.game.collisionMap.trace(top.pos.x, top.pos.y, nudgeX, -nudge / 2, top.size.x, top.size.y);
                top.pos.y = resTop.pos.y;
                var resBottom = ig.game.collisionMap.trace(bottom.pos.x, bottom.pos.y, 0, nudge / 2, bottom.size.x, bottom.size.y);
                bottom.pos.y = resBottom.pos.y;
            }
        };
    });

// lib/impact/map.js
ig.baked = true;
ig.module("impact.map").defines(function () {
    "use strict";
    ig.Map = ig.Class.extend({
        tilesize: 8,
        width: 1,
        height: 1,
        data: [[]],
        name: null,
        init: function (tilesize, data) {
            this.tilesize = tilesize;
            this.data = data;
            this.height = data.length;
            this.width = data[0].length;
            this.pxWidth = this.width * this.tilesize;
            this.pxHeight = this.height * this.tilesize;
        },
        getTile: function (x, y) {
            var tx = Math.floor(x / this.tilesize);
            var ty = Math.floor(y / this.tilesize);
            if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
                return this.data[ty][tx];
            } else {
                return 0;
            }
        },
        setTile: function (x, y, tile) {
            var tx = Math.floor(x / this.tilesize);
            var ty = Math.floor(y / this.tilesize);
            if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
                this.data[ty][tx] = tile;
            }
        },
    });
});

// lib/impact/collision-map.js
ig.baked = true;
ig.module("impact.collision-map")
    .requires("impact.map")
    .defines(function () {
        "use strict";
        ig.CollisionMap = ig.Map.extend({
            lastSlope: 1,
            tiledef: null,
            init: function (tilesize, data, tiledef) {
                this.parent(tilesize, data);
                this.tiledef = tiledef || ig.CollisionMap.defaultTileDef;
                for (var t in this.tiledef) {
                    if (t | (0 > this.lastSlope)) {
                        this.lastSlope = t | 0;
                    }
                }
            },
            trace: function (x, y, vx, vy, objectWidth, objectHeight) {
                var res = { collision: { x: false, y: false, slope: false }, pos: { x: x, y: y }, tile: { x: 0, y: 0 } };
                var steps = Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) / this.tilesize);
                if (steps > 1) {
                    var sx = vx / steps;
                    var sy = vy / steps;
                    for (var i = 0; i < steps && (sx || sy); i++) {
                        this._traceStep(res, x, y, sx, sy, objectWidth, objectHeight, vx, vy, i);
                        x = res.pos.x;
                        y = res.pos.y;
                        if (res.collision.x) {
                            sx = 0;
                            vx = 0;
                        }
                        if (res.collision.y) {
                            sy = 0;
                            vy = 0;
                        }
                        if (res.collision.slope) {
                            break;
                        }
                    }
                } else {
                    this._traceStep(res, x, y, vx, vy, objectWidth, objectHeight, vx, vy, 0);
                }
                return res;
            },
            _traceStep: function (res, x, y, vx, vy, width, height, rvx, rvy, step) {
                res.pos.x += vx;
                res.pos.y += vy;
                var t = 0;
                if (vx) {
                    var pxOffsetX = vx > 0 ? width : 0;
                    var tileOffsetX = vx < 0 ? this.tilesize : 0;
                    var firstTileY = Math.max(Math.floor(y / this.tilesize), 0);
                    var lastTileY = Math.min(Math.ceil((y + height) / this.tilesize), this.height);
                    var tileX = Math.floor((res.pos.x + pxOffsetX) / this.tilesize);
                    var prevTileX = Math.floor((x + pxOffsetX) / this.tilesize);
                    if (step > 0 || tileX == prevTileX || prevTileX < 0 || prevTileX >= this.width) {
                        prevTileX = -1;
                    }
                    if (tileX >= 0 && tileX < this.width) {
                        for (var tileY = firstTileY; tileY < lastTileY; tileY++) {
                            if (prevTileX != -1) {
                                t = this.data[tileY][prevTileX];
                                if (t > 1 && t <= this.lastSlope && this._checkTileDef(res, t, x, y, rvx, rvy, width, height, prevTileX, tileY)) {
                                    break;
                                }
                            }
                            t = this.data[tileY][tileX];
                            if (t == 1 || t > this.lastSlope || (t > 1 && this._checkTileDef(res, t, x, y, rvx, rvy, width, height, tileX, tileY))) {
                                if (t > 1 && t <= this.lastSlope && res.collision.slope) {
                                    break;
                                }
                                res.collision.x = true;
                                res.tile.x = t;
                                x = res.pos.x = tileX * this.tilesize - pxOffsetX + tileOffsetX;
                                rvx = 0;
                                break;
                            }
                        }
                    }
                }
                if (vy) {
                    var pxOffsetY = vy > 0 ? height : 0;
                    var tileOffsetY = vy < 0 ? this.tilesize : 0;
                    var firstTileX = Math.max(Math.floor(res.pos.x / this.tilesize), 0);
                    var lastTileX = Math.min(Math.ceil((res.pos.x + width) / this.tilesize), this.width);
                    var tileY = Math.floor((res.pos.y + pxOffsetY) / this.tilesize);
                    var prevTileY = Math.floor((y + pxOffsetY) / this.tilesize);
                    if (step > 0 || tileY == prevTileY || prevTileY < 0 || prevTileY >= this.height) {
                        prevTileY = -1;
                    }
                    if (tileY >= 0 && tileY < this.height) {
                        for (var tileX = firstTileX; tileX < lastTileX; tileX++) {
                            if (prevTileY != -1) {
                                t = this.data[prevTileY][tileX];
                                if (t > 1 && t <= this.lastSlope && this._checkTileDef(res, t, x, y, rvx, rvy, width, height, tileX, prevTileY)) {
                                    break;
                                }
                            }
                            t = this.data[tileY][tileX];
                            if (t == 1 || t > this.lastSlope || (t > 1 && this._checkTileDef(res, t, x, y, rvx, rvy, width, height, tileX, tileY))) {
                                if (t > 1 && t <= this.lastSlope && res.collision.slope) {
                                    break;
                                }
                                res.collision.y = true;
                                res.tile.y = t;
                                res.pos.y = tileY * this.tilesize - pxOffsetY + tileOffsetY;
                                break;
                            }
                        }
                    }
                }
            },
            _checkTileDef: function (res, t, x, y, vx, vy, width, height, tileX, tileY) {
                var def = this.tiledef[t];
                if (!def) {
                    return false;
                }
                var lx = (tileX + def[0]) * this.tilesize,
                    ly = (tileY + def[1]) * this.tilesize,
                    lvx = (def[2] - def[0]) * this.tilesize,
                    lvy = (def[3] - def[1]) * this.tilesize,
                    solid = def[4];
                var tx = x + vx + (lvy < 0 ? width : 0) - lx,
                    ty = y + vy + (lvx > 0 ? height : 0) - ly;
                if (lvx * ty - lvy * tx > 0) {
                    if (vx * -lvy + vy * lvx < 0) {
                        return solid;
                    }
                    var length = Math.sqrt(lvx * lvx + lvy * lvy);
                    var nx = lvy / length,
                        ny = -lvx / length;
                    var proj = tx * nx + ty * ny;
                    var px = nx * proj,
                        py = ny * proj;
                    if (px * px + py * py >= vx * vx + vy * vy) {
                        return solid || lvx * (ty - vy) - lvy * (tx - vx) < 0.5;
                    }
                    res.pos.x = x + vx - px;
                    res.pos.y = y + vy - py;
                    res.collision.slope = { x: lvx, y: lvy, nx: nx, ny: ny };
                    return true;
                }
                return false;
            },
        });
        var H = 1 / 2,
            N = 1 / 3,
            M = 2 / 3,
            SOLID = true,
            NON_SOLID = false;
        ig.CollisionMap.defaultTileDef = {
            5: [0, 1, 1, M, SOLID],
            6: [0, M, 1, N, SOLID],
            7: [0, N, 1, 0, SOLID],
            3: [0, 1, 1, H, SOLID],
            4: [0, H, 1, 0, SOLID],
            2: [0, 1, 1, 0, SOLID],
            10: [H, 1, 1, 0, SOLID],
            21: [0, 1, H, 0, SOLID],
            32: [M, 1, 1, 0, SOLID],
            43: [N, 1, M, 0, SOLID],
            54: [0, 1, N, 0, SOLID],
            27: [0, 0, 1, N, SOLID],
            28: [0, N, 1, M, SOLID],
            29: [0, M, 1, 1, SOLID],
            25: [0, 0, 1, H, SOLID],
            26: [0, H, 1, 1, SOLID],
            24: [0, 0, 1, 1, SOLID],
            11: [0, 0, H, 1, SOLID],
            22: [H, 0, 1, 1, SOLID],
            33: [0, 0, N, 1, SOLID],
            44: [N, 0, M, 1, SOLID],
            55: [M, 0, 1, 1, SOLID],
            16: [1, N, 0, 0, SOLID],
            17: [1, M, 0, N, SOLID],
            18: [1, 1, 0, M, SOLID],
            14: [1, H, 0, 0, SOLID],
            15: [1, 1, 0, H, SOLID],
            13: [1, 1, 0, 0, SOLID],
            8: [H, 1, 0, 0, SOLID],
            19: [1, 1, H, 0, SOLID],
            30: [N, 1, 0, 0, SOLID],
            41: [M, 1, N, 0, SOLID],
            52: [1, 1, M, 0, SOLID],
            38: [1, M, 0, 1, SOLID],
            39: [1, N, 0, M, SOLID],
            40: [1, 0, 0, N, SOLID],
            36: [1, H, 0, 1, SOLID],
            37: [1, 0, 0, H, SOLID],
            35: [1, 0, 0, 1, SOLID],
            9: [1, 0, H, 1, SOLID],
            20: [H, 0, 0, 1, SOLID],
            31: [1, 0, M, 1, SOLID],
            42: [M, 0, N, 1, SOLID],
            53: [N, 0, 0, 1, SOLID],
            12: [0, 0, 1, 0, NON_SOLID],
            23: [1, 1, 0, 1, NON_SOLID],
            34: [1, 0, 1, 1, NON_SOLID],
            45: [0, 1, 0, 0, NON_SOLID],
        };
        ig.CollisionMap.staticNoCollision = {
            trace: function (x, y, vx, vy) {
                return { collision: { x: false, y: false, slope: false }, pos: { x: x + vx, y: y + vy }, tile: { x: 0, y: 0 } };
            },
        };
    });

// lib/impact/background-map.js
ig.baked = true;
ig.module("impact.background-map")
    .requires("impact.map", "impact.image")
    .defines(function () {
        "use strict";
        ig.BackgroundMap = ig.Map.extend({
            tiles: null,
            scroll: { x: 0, y: 0 },
            distance: 1,
            repeat: false,
            tilesetName: "",
            foreground: false,
            enabled: true,
            preRender: false,
            preRenderedChunks: null,
            chunkSize: 512,
            debugChunks: false,
            anims: {},
            init: function (tilesize, data, tileset) {
                this.parent(tilesize, data);
                this.setTileset(tileset);
            },
            setTileset: function (tileset) {
                this.tilesetName = tileset instanceof ig.Image ? tileset.path : tileset;
                this.tiles = new ig.Image(this.tilesetName);
                this.preRenderedChunks = null;
            },
            setScreenPos: function (x, y) {
                this.scroll.x = x / this.distance;
                this.scroll.y = y / this.distance;
            },
            preRenderMapToChunks: function () {
                var totalWidth = this.width * this.tilesize * ig.system.scale,
                    totalHeight = this.height * this.tilesize * ig.system.scale;
                this.chunkSize = Math.min(Math.max(totalWidth, totalHeight), this.chunkSize);
                var chunkCols = Math.ceil(totalWidth / this.chunkSize),
                    chunkRows = Math.ceil(totalHeight / this.chunkSize);
                this.preRenderedChunks = [];
                for (var y = 0; y < chunkRows; y++) {
                    this.preRenderedChunks[y] = [];
                    for (var x = 0; x < chunkCols; x++) {
                        var chunkWidth = x == chunkCols - 1 ? totalWidth - x * this.chunkSize : this.chunkSize;
                        var chunkHeight = y == chunkRows - 1 ? totalHeight - y * this.chunkSize : this.chunkSize;
                        this.preRenderedChunks[y][x] = this.preRenderChunk(x, y, chunkWidth, chunkHeight);
                    }
                }
            },
            preRenderChunk: function (cx, cy, w, h) {
                var tw = w / this.tilesize / ig.system.scale + 1,
                    th = h / this.tilesize / ig.system.scale + 1;
                var nx = ((cx * this.chunkSize) / ig.system.scale) % this.tilesize,
                    ny = ((cy * this.chunkSize) / ig.system.scale) % this.tilesize;
                var tx = Math.floor((cx * this.chunkSize) / this.tilesize / ig.system.scale),
                    ty = Math.floor((cy * this.chunkSize) / this.tilesize / ig.system.scale);
                var chunk = ig.$new("canvas");
                chunk.width = w;
                chunk.height = h;
                chunk.retinaResolutionEnabled = false;
                var chunkContext = chunk.getContext("2d");
                ig.System.scaleMode(chunk, chunkContext);
                var screenContext = ig.system.context;
                ig.system.context = chunkContext;
                for (var x = 0; x < tw; x++) {
                    for (var y = 0; y < th; y++) {
                        if (x + tx < this.width && y + ty < this.height) {
                            var tile = this.data[y + ty][x + tx];
                            if (tile) {
                                this.tiles.drawTile(x * this.tilesize - nx, y * this.tilesize - ny, tile - 1, this.tilesize);
                            }
                        }
                    }
                }
                ig.system.context = screenContext;
                return chunk;
            },
            draw: function () {
                if (!this.tiles.loaded || !this.enabled) {
                    return;
                }
                if (this.preRender) {
                    this.drawPreRendered();
                } else {
                    this.drawTiled();
                }
            },
            drawPreRendered: function () {
                if (!this.preRenderedChunks) {
                    this.preRenderMapToChunks();
                }
                var dx = ig.system.getDrawPos(this.scroll.x),
                    dy = ig.system.getDrawPos(this.scroll.y);
                if (this.repeat) {
                    var w = this.width * this.tilesize * ig.system.scale;
                    dx = ((dx % w) + w) % w;
                    var h = this.height * this.tilesize * ig.system.scale;
                    dy = ((dy % h) + h) % h;
                }
                var minChunkX = Math.max(Math.floor(dx / this.chunkSize), 0),
                    minChunkY = Math.max(Math.floor(dy / this.chunkSize), 0),
                    maxChunkX = Math.ceil((dx + ig.system.realWidth) / this.chunkSize),
                    maxChunkY = Math.ceil((dy + ig.system.realHeight) / this.chunkSize),
                    maxRealChunkX = this.preRenderedChunks[0].length,
                    maxRealChunkY = this.preRenderedChunks.length;
                if (!this.repeat) {
                    maxChunkX = Math.min(maxChunkX, maxRealChunkX);
                    maxChunkY = Math.min(maxChunkY, maxRealChunkY);
                }
                var nudgeY = 0;
                for (var cy = minChunkY; cy < maxChunkY; cy++) {
                    var nudgeX = 0;
                    for (var cx = minChunkX; cx < maxChunkX; cx++) {
                        var chunk = this.preRenderedChunks[cy % maxRealChunkY][cx % maxRealChunkX];
                        var x = -dx + cx * this.chunkSize - nudgeX;
                        var y = -dy + cy * this.chunkSize - nudgeY;
                        ig.system.context.drawImage(chunk, x, y);
                        ig.Image.drawCount++;
                        if (this.debugChunks) {
                            ig.system.context.strokeStyle = "#f0f";
                            ig.system.context.strokeRect(x, y, this.chunkSize, this.chunkSize);
                        }
                        if (this.repeat && chunk.width < this.chunkSize && x + chunk.width < ig.system.realWidth) {
                            nudgeX += this.chunkSize - chunk.width;
                            maxChunkX++;
                        }
                    }
                    if (this.repeat && chunk.height < this.chunkSize && y + chunk.height < ig.system.realHeight) {
                        nudgeY += this.chunkSize - chunk.height;
                        maxChunkY++;
                    }
                }
            },
            drawTiled: function () {
                var tile = 0,
                    anim = null,
                    tileOffsetX = (this.scroll.x / this.tilesize).toInt(),
                    tileOffsetY = (this.scroll.y / this.tilesize).toInt(),
                    pxOffsetX = this.scroll.x % this.tilesize,
                    pxOffsetY = this.scroll.y % this.tilesize,
                    pxMinX = -pxOffsetX - this.tilesize,
                    pxMinY = -pxOffsetY - this.tilesize,
                    pxMaxX = ig.system.width + this.tilesize - pxOffsetX,
                    pxMaxY = ig.system.height + this.tilesize - pxOffsetY;
                for (var mapY = -1, pxY = pxMinY; pxY < pxMaxY; mapY++, pxY += this.tilesize) {
                    var tileY = mapY + tileOffsetY;
                    if (tileY >= this.height || tileY < 0) {
                        if (!this.repeat) {
                            continue;
                        }
                        tileY = ((tileY % this.height) + this.height) % this.height;
                    }
                    for (var mapX = -1, pxX = pxMinX; pxX < pxMaxX; mapX++, pxX += this.tilesize) {
                        var tileX = mapX + tileOffsetX;
                        if (tileX >= this.width || tileX < 0) {
                            if (!this.repeat) {
                                continue;
                            }
                            tileX = ((tileX % this.width) + this.width) % this.width;
                        }
                        if ((tile = this.data[tileY][tileX])) {
                            if ((anim = this.anims[tile - 1])) {
                                anim.draw(pxX, pxY);
                            } else {
                                this.tiles.drawTile(pxX, pxY, tile - 1, this.tilesize);
                            }
                        }
                    }
                }
            },
        });
    });

// lib/impact/game.js
ig.baked = true;
ig.module("impact.game")
    .requires("impact.impact", "impact.entity", "impact.collision-map", "impact.background-map")
    .defines(function () {
        "use strict";
        ig.Game = ig.Class.extend({
            clearColor: "#000000",
            gravity: 0,
            screen: { x: 0, y: 0 },
            _rscreen: { x: 0, y: 0 },
            entities: [],
            namedEntities: {},
            collisionMap: ig.CollisionMap.staticNoCollision,
            backgroundMaps: [],
            backgroundAnims: {},
            autoSort: false,
            sortBy: null,
            cellSize: 64,
            _deferredKill: [],
            _levelToLoad: null,
            _doSortEntities: false,
            staticInstantiate: function () {
                this.sortBy = this.sortBy || ig.Game.SORT.Z_INDEX;
                ig.game = this;
                return null;
            },
            loadLevel: function (data) {
                this.screen = { x: 0, y: 0 };
                this.entities = [];
                this.namedEntities = {};
                for (var i = 0; i < data.entities.length; i++) {
                    var ent = data.entities[i];
                    this.spawnEntity(ent.type, ent.x, ent.y, ent.settings);
                }
                this.sortEntities();
                this.collisionMap = ig.CollisionMap.staticNoCollision;
                this.backgroundMaps = [];
                for (var i = 0; i < data.layer.length; i++) {
                    var ld = data.layer[i];
                    if (ld.name == "collision") {
                        this.collisionMap = new ig.CollisionMap(ld.tilesize, ld.data);
                    } else {
                        var newMap = new ig.BackgroundMap(ld.tilesize, ld.data, ld.tilesetName);
                        newMap.anims = this.backgroundAnims[ld.tilesetName] || {};
                        newMap.repeat = ld.repeat;
                        newMap.distance = ld.distance;
                        newMap.foreground = !!ld.foreground;
                        newMap.preRender = !!ld.preRender;
                        newMap.name = ld.name;
                        this.backgroundMaps.push(newMap);
                    }
                }
                for (var i = 0; i < this.entities.length; i++) {
                    this.entities[i].ready();
                }
            },
            loadLevelDeferred: function (data) {
                this._levelToLoad = data;
            },
            getMapByName: function (name) {
                if (name == "collision") {
                    return this.collisionMap;
                }
                for (var i = 0; i < this.backgroundMaps.length; i++) {
                    if (this.backgroundMaps[i].name == name) {
                        return this.backgroundMaps[i];
                    }
                }
                return null;
            },
            getEntityByName: function (name) {
                return this.namedEntities[name];
            },
            getEntitiesByType: function (type) {
                var entityClass = typeof type === "string" ? ig.global[type] : type;
                var a = [];
                for (var i = 0; i < this.entities.length; i++) {
                    var ent = this.entities[i];
                    if (ent instanceof entityClass && !ent._killed) {
                        a.push(ent);
                    }
                }
                return a;
            },
            spawnEntity: function (type, x, y, settings) {
                var entityClass = typeof type === "string" ? ig.global[type] : type;
                if (!entityClass) {
                    throw "Can't spawn entity of type " + type;
                }
                var ent = new entityClass(x, y, settings || {});
                this.entities.push(ent);
                if (ent.name) {
                    this.namedEntities[ent.name] = ent;
                }
                return ent;
            },
            sortEntities: function () {
                this.entities.sort(this.sortBy);
            },
            sortEntitiesDeferred: function () {
                this._doSortEntities = true;
            },
            removeEntity: function (ent) {
                if (ent.name) {
                    delete this.namedEntities[ent.name];
                }
                ent._killed = true;
                ent.type = ig.Entity.TYPE.NONE;
                ent.checkAgainst = ig.Entity.TYPE.NONE;
                ent.collides = ig.Entity.COLLIDES.NEVER;
                this._deferredKill.push(ent);
            },
            run: function () {
                this.update();
                this.draw();
            },
            update: function () {
                if (this._levelToLoad) {
                    this.loadLevel(this._levelToLoad);
                    this._levelToLoad = null;
                }
                this.updateEntities();
                this.checkEntities();
                for (var i = 0; i < this._deferredKill.length; i++) {
                    this._deferredKill[i].erase();
                    this.entities.erase(this._deferredKill[i]);
                }
                this._deferredKill = [];
                if (this._doSortEntities || this.autoSort) {
                    this.sortEntities();
                    this._doSortEntities = false;
                }
                for (var tileset in this.backgroundAnims) {
                    var anims = this.backgroundAnims[tileset];
                    for (var a in anims) {
                        anims[a].update();
                    }
                }
            },
            updateEntities: function () {
                for (var i = 0; i < this.entities.length; i++) {
                    var ent = this.entities[i];
                    if (!ent._killed) {
                        ent.update();
                    }
                }
            },
            draw: function () {
                if (this.clearColor) {
                    ig.system.clear(this.clearColor);
                }
                this._rscreen.x = ig.system.getDrawPos(this.screen.x) / ig.system.scale;
                this._rscreen.y = ig.system.getDrawPos(this.screen.y) / ig.system.scale;
                var mapIndex;
                for (mapIndex = 0; mapIndex < this.backgroundMaps.length; mapIndex++) {
                    var map = this.backgroundMaps[mapIndex];
                    if (map.foreground) {
                        break;
                    }
                    map.setScreenPos(this.screen.x, this.screen.y);
                    map.draw();
                }
                this.drawEntities();
                for (mapIndex; mapIndex < this.backgroundMaps.length; mapIndex++) {
                    var map = this.backgroundMaps[mapIndex];
                    map.setScreenPos(this.screen.x, this.screen.y);
                    map.draw();
                }
            },
            drawEntities: function () {
                for (var i = 0; i < this.entities.length; i++) {
                    this.entities[i].draw();
                }
            },
            checkEntities: function () {
                var hash = {};
                for (var e = 0; e < this.entities.length; e++) {
                    var entity = this.entities[e];
                    if (entity.type == ig.Entity.TYPE.NONE && entity.checkAgainst == ig.Entity.TYPE.NONE && entity.collides == ig.Entity.COLLIDES.NEVER) {
                        continue;
                    }
                    var checked = {},
                        xmin = Math.floor(entity.pos.x / this.cellSize),
                        ymin = Math.floor(entity.pos.y / this.cellSize),
                        xmax = Math.floor((entity.pos.x + entity.size.x) / this.cellSize) + 1,
                        ymax = Math.floor((entity.pos.y + entity.size.y) / this.cellSize) + 1;
                    for (var x = xmin; x < xmax; x++) {
                        for (var y = ymin; y < ymax; y++) {
                            if (!hash[x]) {
                                hash[x] = {};
                                hash[x][y] = [entity];
                            } else if (!hash[x][y]) {
                                hash[x][y] = [entity];
                            } else {
                                var cell = hash[x][y];
                                for (var c = 0; c < cell.length; c++) {
                                    if (entity.touches(cell[c]) && !checked[cell[c].id]) {
                                        checked[cell[c].id] = true;
                                        ig.Entity.checkPair(entity, cell[c]);
                                    }
                                }
                                cell.push(entity);
                            }
                        }
                    }
                }
            },
        });
        ig.Game.SORT = {
            Z_INDEX: function (a, b) {
                return a.zIndex - b.zIndex;
            },
            POS_X: function (a, b) {
                return a.pos.x + a.size.x - (b.pos.x + b.size.x);
            },
            POS_Y: function (a, b) {
                return a.pos.y + a.size.y - (b.pos.y + b.size.y);
            },
        };
    });

// lib/plugins/parallax.js
ig.baked = true;
ig.module("plugins.parallax")
    .requires("impact.image")
    .defines(function () {
        Parallax = ig.Class.extend({
            layers: [],
            screen: { x: 0, y: 0 },
            init: function (settings) {
                ig.merge(this, settings);
            },
            add: function (path, settings) {
                var layer = new ParallaxLayer(path, settings);
                this.layers.push(layer);
            },
            move: function (x) {
                this.screen.x += x * ig.system.tick;
            },
            draw: function () {
                for (var i = 0; i < this.layers.length; i++) {
                    var layer = this.layers[i];
                    var x = -((this.screen.x / layer.distance) % layer.w);
                    if (this.screen.x <= 0) x = x - layer.w;
                    layer.x = x;
                    while (layer.x < ig.system.width) {
                        layer.draw();
                        layer.x += layer.w;
                    }
                    layer.x = x;
                }
            },
        });
        ParallaxLayer = ig.Class.extend({
            distance: 0,
            x: 0,
            y: 0,
            w: 0,
            h: 0,
            img: null,
            init: function (path, settings) {
                if (settings && settings.distance == 0) settings.distance = 1;
                this.img = new ig.Image(path);
                this.w = this.img.width;
                this.h = this.img.height;
                ig.merge(this, settings);
            },
            draw: function () {
                this.img.draw(this.x, this.y);
            },
        });
    });

// lib/plugins/impact-splash-loader.js
ig.baked = true;
ig.module("plugins.impact-splash-loader")
    .requires("impact.loader")
    .defines(function () {
        ig.ImpactSplashLoader = ig.Loader.extend({
            endTime: 0,
            fadeToWhiteTime: 200,
            fadeToGameTime: 800,
            logoWidth: 340,
            logoHeight: 120,
            end: function () {
                this.parent();
                this.endTime = Date.now();
                ig.system.setDelegate(this);
            },
            run: function () {
                var t = Date.now() - this.endTime;
                var alpha = 1;
                if (t < this.fadeToWhiteTime) {
                    this.draw();
                    alpha = t.map(0, this.fadeToWhiteTime, 0, 1);
                } else if (t < this.fadeToGameTime) {
                    ig.game.run();
                    alpha = t.map(this.fadeToWhiteTime, this.fadeToGameTime, 1, 0);
                } else {
                    ig.system.setDelegate(ig.game);
                    return;
                }
                ig.system.context.fillStyle = "rgba(255,255,255," + alpha + ")";
                ig.system.context.fillRect(0, 0, ig.system.realWidth, ig.system.realHeight);
            },
            draw: function () {
                this._drawStatus += (this.status - this._drawStatus) / 5;
                var ctx = ig.system.context;
                var w = ig.system.realWidth;
                var h = ig.system.realHeight;
                var scale = w / this.logoWidth / 3;
                var center = (w - this.logoWidth * scale) / 2;
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(0, 0, w, h);
                var loadingScreen = new Image();
                loadingScreen.src =
                  "data:image/png;base64,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PSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgIHhtbG5zOkdJTVA9Imh0dHA6Ly93d3cuZ2ltcC5vcmcveG1wLyIKICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICB4bXBNTTpEb2N1bWVudElEPSJnaW1wOmRvY2lkOmdpbXA6MjUzN2U3MjctMGFhYy00OTRlLWJhODEtYzJmYTAxZTJjNzhhIgogICB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjA1YjRkNjVmLTA3NzktNDY1NS05ZmEwLWI5NzgwOGQ0NjFlZCIKICAgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmVkOTQ5NjljLWM1YTAtNDQ0OC1iZDVkLTM1ZWJhMGJhYmIyOSIKICAgZGM6Rm9ybWF0PSJpbWFnZS9wbmciCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09IkxpbnV4IgogICBHSU1QOlRpbWVTdGFtcD0iMTYyODgxMjg5MjM0OTQ4MSIKICAgR0lNUDpWZXJzaW9uPSIyLjEwLjI0IgogICB0aWZmOk9yaWVudGF0aW9uPSIxIgogICB4bXA6Q3JlYXRvclRvb2w9IkdJTVAgMi4xMCI+CiAgIDx4bXBNTTpIaXN0b3J5PgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InNhdmVkIgogICAgICBzdEV2dDpjaGFuZ2VkPSIvIgogICAgICBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjNhOGRlMWM1LWY5NWQtNDUyYS05ODNiLTBmYTRiNzU0ZjQ4MiIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iR2ltcCAyLjEwIChMaW51eCkiCiAgICAgIHN0RXZ0OndoZW49IjIwMjEtMDgtMTJUMjA6MDE6MzItMDQ6MDAiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSJ3Ij8+VaDgSwAAAchQTFRFLAgceL4xdrwyhsUsq4UA//8A/5kAiE+WngDBYQB2lMsnc7kzgcIuer8wZqo5jMcpfMAva683/74AfsEvYaQ7/6cAbbE2/8UAb7Q1//UAdlkC/50A/9AA//sA/6wA/+IAj8kocLY0/7IAg8Mtcrcz/+8BaK03Wy1bQjcfW509iccrX6E8/9sAPxc2jm0AOjAjR1grNB0dfQCZ/8oAXmkhSyBGcj14ZKc5ekSE/9UBcACJQ0Ij/+kA/7cAMBIcVH4yUmYomM4l/6IAlCOtZwd8aDZrnxySOykdgkqOLg0fwYwAjjJYKQYacJUmjD6fS04irWYxjwCvmgC7mBK37JMJWokyUVsjbhRjqk5DdqYooHkGe5oiUHIvw6UAhwCkZ5YsNhArpEFi13Yc5qEqtCuSZ3sjZIsp//lDVCdRvD+FdyKE4Xc5zGtkow24/fhzNSQgkDCmtTzNhEE55b4D2qgPzVFfpBKonCh4XHQm1pcMbUEdvJgAfDmOcYoiV5Q60IPblGIahLomZqEx6Mel8+MJdbQsndAjklAx//yeu4QlhK8k7c8I/fvo58Ex37jn3LZsw2DYaCVD4tcA79y///8UzHiVv58x3aWzrbZBpwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+UIDQABIGoyogQAAB39SURBVHja7Z3La+TIloe9uGD39sLgTTOL2eW2CoSmYNBClU0yF4quzFnMqqBpQZPVrSHFHdQ0GHmgFs3FmNQmr//dibdCircUKSvT5yyq23ZmSIpPJx4nTsTv5hbsqu0GqgAAgwFg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";
                ctx.drawImage(loadingScreen, 0, 0);
                ctx.save();
                ctx.translate(center, h / 1.9);
                ctx.scale(scale, scale);
                ctx.lineWidth = "3";
                ctx.strokeStyle = "rgb(255,255,255)";
                ctx.strokeRect(25, this.logoHeight + 40, 300, 20);
                ctx.fillStyle = "rgb(255,255,255)";
                ctx.fillRect(30, this.logoHeight + 45, 290 * this._drawStatus, 10);
                ctx.restore();
            },
            drawPaths: function (color, paths) {
                var ctx = ig.system.context;
                ctx.fillStyle = color;
                for (var i = 0; i < paths.length; i += 2) {
                    ctx[ig.ImpactSplashLoader.OPS[paths[i]]].apply(ctx, paths[i + 1]);
                }
            },
        });
        ig.ImpactSplashLoader.OPS = { bp: "beginPath", cp: "closePath", f: "fill", m: "moveTo", l: "lineTo", bc: "bezierCurveTo" };
    });

// lib/plugins/canvas-css3-scaling.js
ig.baked = true;
ig.module("plugins.canvas-css3-scaling")
    .requires("impact.input")
    .defines(function () {
        CanvasCSS3Scaling = ig.Class.extend({
            offset: null,
            scale: null,
            init: function () {
                this.element = document.getElementById("game");
                this.canvas = this.element.firstElementChild;
                this.content = [this.canvas.width, this.canvas.height];
                window.addEventListener("resize", this, false);
                window.addEventListener("orientationchange", this, false);
                this.reflow();
                ig.Input.inject({
                    mousemove: function (event) {
                        var internalWidth = parseInt(ig.system.canvas.offsetWidth) || ig.system.realWidth;
                        var scale = ig.system.scale * (internalWidth / ig.system.realWidth);
                        var pos = { left: 0, top: 0 };
                        if (ig.system.canvas.getBoundingClientRect) {
                            pos = ig.system.canvas.getBoundingClientRect();
                        }
                        var ev = event.touches ? event.touches[0] : event;
                        this.mouse.x = (ev.pageX - ig.CanvasCSS3Scaling.offset[0]) / ig.CanvasCSS3Scaling.scale;
                        this.mouse.y = (ev.pageY - ig.CanvasCSS3Scaling.offset[1]) / ig.CanvasCSS3Scaling.scale;
                    },
                });
            },
            reflow: function () {
                var browser = [window.innerWidth, window.innerHeight];
                var scale = (this.scale = Math.min(browser[0] / this.content[0], browser[1] / this.content[1]));
                var size = [this.content[0] * scale, this.content[1] * scale];
                var offset = (this.offset = [(browser[0] - size[0]) / 2, (browser[1] - size[1]) / 2]);
                var rule = "translate(" + offset[0] + "px, " + offset[1] + "px) scale(" + scale + ")";
                this.element.style.transform = rule;
                this.element.style.webkitTransform = rule;
            },
            handleEvent: function (evt) {
                if (evt.type == "resize" || evt.type == "orientationchange") {
                    this.reflow();
                }
            },
        });
    });

// lib/plugins/impact-storage.js
ig.baked = true;
ig.module("plugins.impact-storage")
    .requires("impact.game")
    .defines(function () {
        ig.Storage = ig.Class.extend({
            staticInstantiate: function (i) {
                return !ig.Storage.instance ? null : ig.Storage.instance;
            },
            init: function () {
                ig.Storage.instance = this;
            },
            isCapable: function () {
                return !(typeof window.localStorage === "undefined");
            },
            isSet: function (key) {
                return !(this.get(key) === null);
            },
            initUnset: function (key, value) {
                if (this.get(key) === null) this.set(key, value);
            },
            get: function (key) {
                if (!this.isCapable()) return null;
                try {
                    return JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    return window.localStorage.getItem(key);
                }
            },
            getInt: function (key) {
                return ~~this.get(key);
            },
            getFloat: function (key) {
                return parseFloat(this.get(key));
            },
            getBool: function (key) {
                return !!this.get(key);
            },
            key: function (n) {
                return this.isCapable() ? window.localStorage.key(n) : null;
            },
            set: function (key, value) {
                if (!this.isCapable()) return null;
                try {
                    window.localStorage.setItem(key, JSON.stringify(value));
                } catch (e) {
                    if (e == QUOTA_EXCEEDED_ERR) console.log("localStorage quota exceeded");
                }
            },
            setHighest: function (key, value) {
                if (value > this.getFloat(key)) this.set(key, value);
            },
            remove: function (key) {
                if (!this.isCapable()) return null;
                window.localStorage.removeItem(key);
            },
            clear: function () {
                if (!this.isCapable()) return null;
                window.localStorage.clear();
            },
        });
    });

// lib/rogers.js
ig.baked = true;
ig.module("rogers")
    .requires("impact.game", "impact.entity", "impact.font", "plugins.parallax", "plugins.impact-splash-loader", "plugins.canvas-css3-scaling", "plugins.impact-storage")
    .defines(function () {
        var _LANG_CODE, _LANG_STRING;
        getOrRefreshLanguage = function () {
            _LANG_CODE = document.webL10n.getLanguage() || "en";
            if (!_LANG_SIZES[_LANG_CODE]) {
                _LANG_CODE = "en";
            }
            _LANG_STRING = "lang/" + _LANG_CODE + "/";
        };
        var _LANG_SIZES = {
            en: { shield: { x: 100, y: 20 }, score: { x: 150, y: 20 } },
            es: { shield: { x: 105, y: 20 }, score: { x: 168, y: 20 } },
            pt: { shield: { x: 105, y: 20 }, score: { x: 170, y: 20 } },
            tr: { shield: { x: 102, y: 20 }, score: { x: 143, y: 20 } },
            cs: { shield: { x: 92, y: 20 }, score: { x: 150, y: 20 } },
            ja: { shield: { x: 83, y: 20 }, score: { x: 146, y: 20 } },
        };
        _LANG_LIST = ["en", "es", "pt", "tr", "cs", "ja"];
        getOrRefreshLanguage();
        var animSheetList = {
            buttonBack: {},
            buttonContinue: {},
            buttonRestart: {},
            buttonStart: {},
            buttonContinueImg: {},
            gameoverBest: {},
            gameoverHighscore: {},
            gameoverScore: {},
            screenGamecompleted: {},
            screenGameOverAsteroid: {},
            screenGameOverMine: {},
            screenGameOverOffscreen: {},
            screenHowto: {},
            screenPause: {},
            screenStory: {},
            UIScore: {},
            UIShield: {},
        };
        for (var l = 0; l < _LANG_LIST.length; l++) {
            var lang = _LANG_LIST[l];
            animSheetList.buttonBack[lang] = new ig.AnimationSheet("media/img/lang/" + lang + "/button-back.png", 186, 58);
            animSheetList.buttonContinue[lang] = new ig.AnimationSheet("media/img/lang/" + lang + "/button-continue.png", 132, 43);
            animSheetList.buttonRestart[lang] = new ig.AnimationSheet("media/img/lang/" + lang + "/button-restart.png", 186, 58);
            animSheetList.buttonStart[lang] = new ig.AnimationSheet("media/img/lang/" + lang + "/button-start.png", 181, 60);
            animSheetList.buttonContinueImg[lang] = new ig.Image("media/img/lang/" + lang + "/button-continue.png");
            animSheetList.gameoverBest[lang] = new ig.Image("media/img/lang/" + lang + "/gameover-best.png");
            animSheetList.gameoverHighscore[lang] = new ig.Image("media/img/lang/" + lang + "/gameover-highscore.png");
            animSheetList.gameoverScore[lang] = new ig.Image("media/img/lang/" + lang + "/gameover-score.png");
            animSheetList.screenGamecompleted[lang] = new ig.Image("media/img/lang/" + lang + "/screen-gamecompleted.png");
            animSheetList.screenGameOverAsteroid[lang] = new ig.Image("media/img/lang/" + lang + "/screen-gameover-asteroid.png");
            animSheetList.screenGameOverMine[lang] = new ig.Image("media/img/lang/" + lang + "/screen-gameover-mine.png");
            animSheetList.screenGameOverOffscreen[lang] = new ig.Image("media/img/lang/" + lang + "/screen-gameover-offscreen.png");
            animSheetList.screenHowto[lang] = new ig.Image("media/img/lang/" + lang + "/screen-howto.png");
            animSheetList.screenPause[lang] = new ig.Image("media/img/lang/" + lang + "/screen-pause.png");
            animSheetList.screenStory[lang] = new ig.Image("media/img/lang/" + lang + "/screen-story.png");
            animSheetList.UIScore[lang] = new ig.AnimationSheet("media/img/lang/" + lang + "/ui-score.png", _LANG_SIZES[lang]["score"].x, _LANG_SIZES[lang]["score"].y);
            animSheetList.UIShield[lang] = new ig.AnimationSheet("media/img/lang/" + lang + "/ui-shield.png", _LANG_SIZES[lang]["shield"].x, _LANG_SIZES[lang]["shield"].y);
        }
        EntityAsteroid = ig.Entity.extend({
            sizes: [16, 21, 32, 42, 47],
            damage: [10, 10, 20, 30, 30],
            num: 0,
            speed: 0,
            maxVel: { x: 0, y: 0 },
            type: ig.Entity.TYPE.B,
            sound: new ig.Sound("media/audio/asteroid-hit.*"),
            init: function (x, y, settings) {
                this.num = Math.floor(Math.random() * this.sizes.length);
                var actualSize = this.sizes[this.num];
                this.size = { x: actualSize, y: actualSize };
                this.animSheet = new ig.AnimationSheet("media/img/asteroid-" + actualSize + ".png", actualSize, actualSize);
                var animationTable = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
                if (Math.random() < 0.5) {
                    animationTable.reverse();
                }
                this.addAnim("rotate", 0.07, animationTable);
                this.parent(x, y, settings);
                this.speed = ig.game.speed + Math.random() * ig.game.speed - Math.random() * ig.game.speed;
            },
            update: function () {
                this.parent();
                if (this.pos.x - ig.game.screen.x < -50) {
                    this.kill();
                }
            },
            check: function (other) {
                ig.game.player.receiveDamage(this.damage[this.num], this);
                ig.game.UIShield.currentAnim = ig.game.UIShield.anims[ig.game.player.health.floor().toString()];
                if (ig.game.player.health <= 0) {
                    ig.game.gameOverType = "asteroid";
                }
                if (ig.Sound.enabled) this.sound.play();
                this.kill();
            },
            kill: function () {
                if (this.pos.x + 50 > 0) {
                    if (ig.game.BtnBomb && ig.game.BtnBomb.bombingInProgress) {
                        ig.game.spawnEntity(EntityAsteroidExplosion, this.pos.x - 42, this.pos.y - 42);
                    } else {
                        ig.game.spawnEntity(EntityAsteroidExplosion, ig.game.player.pos.x, ig.game.player.pos.y - 40);
                    }
                }
                this.parent();
            },
        });
        EntityAsteroidExplosion = ig.Entity.extend({
            lifetime: 0.3,
            size: { x: 1, y: 1 },
            maxVel: { x: 0, y: 0 },
            animSheet: new ig.AnimationSheet("media/img/asteroid-explosion.png", 93, 96),
            type: ig.Entity.TYPE.NONE,
            init: function (x, y, settings) {
                this.addAnim("hit", 0.03, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
                this.addAnim("bomb", 0.03, [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10]);
                this.parent(x, y, settings);
                this.idleTimer = new ig.Timer();
                this.currentAnim = ig.game.BtnBomb && ig.game.BtnBomb.bombingInProgress ? this.anims["bomb"] : this.anims["hit"];
            },
            update: function () {
                if (this.idleTimer.delta() > this.lifetime) {
                    this.kill();
                    return;
                }
                this.parent();
            },
        });
        EntityButton = ig.Entity.extend({
            sound: new ig.Sound("media/audio/button-click.*"),
            init: function (x, y, settings) {
                this.addAnim("idle", 0.1, [0]);
                this.parent(x, y, settings);
            },
            inFocus: function () {
                return (
                    this.pos.x <= ig.input.mouse.x + ig.game.screen.x &&
                    ig.input.mouse.x + ig.game.screen.x <= this.pos.x + this.size.x &&
                    this.pos.y <= ig.input.mouse.y + ig.game.screen.y &&
                    ig.input.mouse.y + ig.game.screen.y <= this.pos.y + this.size.y
                );
            },
        });
        EntityButtonEnclave = EntityButton.extend({
            size: { x: 100, y: 41 },
            animSheet: new ig.AnimationSheet("media/img/button-enclave.png", 100, 41),
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                    window.top.location.href = "http://enclavegames.com";
                }
            },
        });
        EntityButtonBlackmoon = EntityButton.extend({
            size: { x: 35, y: 40 },
            animSheet: new ig.AnimationSheet("media/img/button-blackmoon.png", 35, 40),
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                    window.top.location.href = "http://blackmoondev.com";
                }
            },
        });
        EntityButtonStart = EntityButton.extend({
            size: { x: 181, y: 60 },
            animSheet: animSheetList.buttonStart[_LANG_CODE],
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) {
                        this.sound.play();
                    }
                    ig.system.setGame(StoryScreen);
                }
            },
        });
        EntityButtonPause = EntityButton.extend({
            size: { x: 42, y: 44 },
            animSheet: new ig.AnimationSheet("media/img/button-pause.png", 42, 44),
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                    ig.game.gamePaused = !ig.game.gamePaused;
                }
            },
        });
        EntityButtonBomb = EntityButton.extend({
            size: { x: 42, y: 44 },
            animSheet: new ig.AnimationSheet("media/img/button-bomb.png", 42, 44),
            sound: new ig.Sound("media/audio/asteroid-hit.*"),
            bombingInProgress: false,
            init: function (x, y, settings) {
                this.addAnim("active", 0.1, [0]);
                this.addAnim("inactive", 0.1, [1]);
                this.parent(x, y, settings);
                this.currentAnim = this.anims["active"];
            },
            update: function () {
                if ((ig.input.pressed("click") && this.inFocus()) || ig.game.activateBombing) {
                    if (this.currentAnim == this.anims["active"]) {
                        this.bombingInProgress = true;
                        if (ig.Sound.enabled) this.sound.play();
                        for (var i = 0; i < ig.game.entities.length; i++) {
                            if (ig.game.entities[i].type == ig.Entity.TYPE.B) ig.game.entities[i].kill();
                        }
                        this.currentAnim = this.anims["inactive"];
                        ig.game.activateBombing = false;
                        ig.game.BtnBomb.bombingInProgress = false;
                    }
                }
            },
        });
        EntityButtonAudio = EntityButton.extend({
            size: { x: 42, y: 44 },
            animSheet: new ig.AnimationSheet("media/img/button-audio.png", 42, 44),
            init: function (x, y, settings) {
                this.addAnim("true", 0.1, [0]);
                this.addAnim("false", 0.1, [1]);
                this.parent(x, y, settings);
            },
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (!ig.ua.iOS) {
                        ig.Sound.enabled = !ig.Sound.enabled;
                        if (ig.game.storage.isCapable()) ig.game.storage.set("rogers-audio", ig.Sound.enabled);
                        this.currentAnim = this.anims[ig.Sound.enabled.toString()];
                        if (ig.Sound.enabled) {
                            ig.music.play();
                            this.sound.play();
                        } else {
                            ig.music.pause();
                        }
                    }
                }
            },
        });
        EntityButtonFacebook = EntityButton.extend({
            size: { x: 66, y: 69 },
            animSheet: new ig.AnimationSheet("media/img/button-facebook.png", 66, 69),
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                    window.top.location.href = "";
                }
            },
        });
        EntityButtonBack = EntityButton.extend({
            size: { x: 186, y: 58 },
            animSheet: animSheetList.buttonBack[_LANG_CODE],
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                    ig.system.setGame(StartScreen);
                }
            },
        });
        EntityButtonContinue = EntityButton.extend({
            size: { x: 132, y: 43 },
            animSheet: animSheetList.buttonContinue[_LANG_CODE],
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                }
            },
        });
        EntityButtonContinueHowTo = EntityButton.extend({
            size: { x: 132, y: 43 },
            animSheet: animSheetList.buttonContinue[_LANG_CODE],
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                    ig.system.setGame(HowToScreen);
                }
            },
        });
        EntityButtonContinueGame = EntityButton.extend({
            size: { x: 132, y: 43 },
            animSheet: animSheetList.buttonContinue[_LANG_CODE],
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                    ig.system.setGame(RogersGame);
                }
            },
        });
        EntityButtonRestart = EntityButton.extend({
            size: { x: 186, y: 58 },
            animSheet: animSheetList.buttonRestart[_LANG_CODE],
            update: function () {
                if (ig.input.pressed("click") && this.inFocus()) {
                    if (ig.Sound.enabled) this.sound.play();
                    this.gameOverRunOnce = false;
                    ig.system.setGame(RogersGame);
                }
            },
        });
        EntityItemShield = ig.Entity.extend({
            size: { x: 28, y: 23 },
            maxVel: { x: 0, y: 0 },
            animSheet: new ig.AnimationSheet("media/img/shield.png", 28, 23),
            type: ig.Entity.TYPE.B,
            sound: new ig.Sound("media/audio/shield-collect.*"),
            init: function (x, y, settings) {
                this.addAnim("idle", 0.1, [0]);
                this.parent(x, y, settings);
            },
            update: function () {
                this.parent();
                if (this.pos.x - ig.game.screen.x < -this.size.x) {
                    this.kill();
                }
            },
            check: function (other) {
                ig.game.player.health += 20;
                if (ig.game.player.health > ig.game.player.maxHealth) {
                    ig.game.player.health = ig.game.player.maxHealth;
                }
                ig.game.UIShield.currentAnim = ig.game.UIShield.anims[ig.game.player.health.floor().toString()];
                if (ig.Sound.enabled) this.sound.play();
                this.kill();
            },
        });
        EntityItemBomb = ig.Entity.extend({
            size: { x: 28, y: 23 },
            maxVel: { x: 0, y: 0 },
            animSheet: new ig.AnimationSheet("media/img/bomb.png", 28, 23),
            type: ig.Entity.TYPE.B,
            sound: new ig.Sound("media/audio/shield-collect.*"),
            init: function (x, y, settings) {
                this.addAnim("idle", 0.1, [0]);
                this.parent(x, y, settings);
            },
            update: function () {
                this.parent();
                if (this.pos.x - ig.game.screen.x < -this.size.x) {
                    this.kill();
                }
            },
            check: function (other) {
                ig.game.BtnBomb.currentAnim = ig.game.BtnBomb.anims["active"];
                if (ig.Sound.enabled) this.sound.play();
                this.kill();
            },
        });
        EntityItemStar = ig.Entity.extend({
            size: { x: 26, y: 26 },
            maxVel: { x: 0, y: 0 },
            animSheet: new ig.AnimationSheet("media/img/star.png", 26, 26),
            type: ig.Entity.TYPE.B,
            sound: new ig.Sound("media/audio/bonus-collect.*"),
            init: function (x, y, settings) {
                this.addAnim("rotate", 0.1, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
                this.parent(x, y, settings);
            },
            update: function () {
                this.parent();
                if (this.pos.x - ig.game.screen.x < -this.size.x) {
                    this.kill();
                }
            },
            check: function (other) {
                ig.game.score += 200;
                if (ig.Sound.enabled) this.sound.play();
                this.kill();
            },
        });
        EntityItemMine = ig.Entity.extend({
            size: { x: 32, y: 32 },
            maxVel: { x: 0, y: 0 },
            direction: 0,
            animSheet: new ig.AnimationSheet("media/img/mine.png", 32, 32),
            type: ig.Entity.TYPE.B,
            init: function (x, y, settings) {
                this.addAnim("idle", 0.1, [0]);
                this.parent(x, y, settings);
                this.direction = Math.floor(Math.random() * 2) * 2 - 1;
            },
            update: function () {
                this.parent();
                if (this.pos.x - ig.game.screen.x < -this.size.x) {
                    this.kill();
                }
                if (this.pos.y > ig.system.height - this.size.y || this.pos.y < 0) {
                    this.direction = -this.direction;
                }
                this.pos.y += this.direction;
            },
            check: function (other) {
                this.kill();
                ig.game.gameOverType = "mine";
                ig.game.player.kill();
            },
        });
        EntityUIShield = ig.Entity.extend({
            size: { x: _LANG_SIZES[_LANG_CODE]["shield"].x, y: _LANG_SIZES[_LANG_CODE]["shield"].y },
            maxVel: { x: 0, y: 0 },
            animSheet: animSheetList.UIShield[_LANG_CODE],
            type: ig.Entity.TYPE.NONE,
            init: function (x, y, settings) {
                this.addAnim("10", 0.1, [0]);
                this.addAnim("20", 0.1, [1]);
                this.addAnim("30", 0.1, [2]);
                this.addAnim("40", 0.1, [3]);
                this.addAnim("50", 0.1, [4]);
                this.addAnim("60", 0.1, [5]);
                this.addAnim("70", 0.1, [6]);
                this.addAnim("80", 0.1, [7]);
                this.addAnim("90", 0.1, [8]);
                this.addAnim("100", 0.1, [9]);
                this.currentAnim = this.anims["100"];
                this.parent(x, y, settings);
            },
            update: function () {
                this.parent();
            },
        });
        EntityUIScore = ig.Entity.extend({
            font: new ig.Font("media/telemarines.font.png"),
            size: { x: _LANG_SIZES[_LANG_CODE]["score"].x, y: _LANG_SIZES[_LANG_CODE]["score"].y },
            maxVel: { x: 0, y: 0 },
            animSheet: animSheetList.UIScore[_LANG_CODE],
            type: ig.Entity.TYPE.NONE,
            init: function (x, y, settings) {
                this.addAnim("idle", 0.1, [0]);
                this.parent(x, y, settings);
            },
            update: function () {
                this.parent();
            },
            draw: function () {
                this.parent();
                this.font.draw(ig.game.score.floor().toString(), ig.system.width - 60 - 52, 10, ig.Font.ALIGN.RIGHT);
            },
        });
        EntityPlayer = ig.Entity.extend({
            health: 100,
            maxHealth: 100,
            size: { x: 50, y: 30 },
            offset: { x: 20, y: 30 },
            type: ig.Entity.TYPE.NONE,
            checkAgainst: ig.Entity.TYPE.B,
            animSheet: new ig.AnimationSheet("media/img/player.png", 82, 74),
            maxVel: { x: 0, y: 110 },
            friction: { x: 0, y: 225 },
            speed: 200,
            ascend: 140,
            sound: new ig.Sound("media/audio/player-engines.*"),
            soundLifetime: 1,
            init: function (x, y, settings) {
                this.addAnim("up", 0.025, [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
                this.addAnim("idle", 0.025, [7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8]);
                this.parent(x, y, settings);
                this.soundTimer = new ig.Timer();
            },
            update: function () {
                if (ig.input.state("up") || ig.input.state("click")) {
                    if (ig.game.player.pos.y > ig.game.screen.y) {
                        if (ig.Sound.enabled && this.soundTimer.delta() >= 0) {
                            this.sound.play();
                            this.soundTimer.set(this.soundLifetime);
                        }
                        this.vel.y = -this.ascend;
                        this.currentAnim = this.anims.up;
                    }
                } else {
                    this.currentAnim = this.anims.idle;
                }
                this.parent();
            },
            check: function (other) {
                other.check();
            },
            kill: function () {
                ig.game.spawnEntity(EntityPlayerExplosion, ig.game.player.pos.x - 70, ig.game.player.pos.y - 90, { callBack: this.onDeath });
                this.parent();
            },
            onDeath: function () {
                ig.game.gameOver = true;
            },
        });
        EntityPlayerExplosion = ig.Entity.extend({
            lifetime: 1.5,
            callBack: null,
            size: { x: 1, y: 1 },
            maxVel: { x: 0, y: 0 },
            animSheet: new ig.AnimationSheet("media/img/player-explosion.png", 174, 208),
            type: ig.Entity.TYPE.NONE,
            sound: new ig.Sound("media/audio/player-explosion.*"),
            init: function (x, y, settings) {
                this.addAnim("kaboom", 0.03, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
                this.parent(x, y, settings);
                this.idleTimer = new ig.Timer();
                if (ig.Sound.enabled) this.sound.play();
            },
            update: function () {
                if (this.idleTimer.delta() > this.lifetime) {
                    this.kill();
                    if (this.callBack) {
                        this.callBack();
                    }
                    return;
                }
                this.parent();
            },
            draw: function () {
                this.pos.x = ig.game.screen.x;
                this.parent();
            },
        });
        RogersGame = ig.Game.extend({
            clearColor: null,
            gravity: 350,
            player: null,
            gameOver: false,
            gameOverType: null,
            gamePaused: false,
            gameCompleted: false,
            maxScore: 2000,
            score: 0,
            speed: 1.5,
            seconds: null,
            secondsTimer: null,
            gameOverRunOnce: false,
            font: new ig.Font("media/telemarines.font.png"),
            background: new ig.Image("media/img/deepspace.png"),
            stars: new ig.Image("media/img/stars.png"),
            gameOverScreenAsteroid: animSheetList.screenGameOverAsteroid[_LANG_CODE],
            gameOverScreenMine: animSheetList.screenGameOverMine[_LANG_CODE],
            gameOverScreenOffscreen: animSheetList.screenGameOverOffscreen[_LANG_CODE],
            gameOverScore: animSheetList.gameoverScore[_LANG_CODE],
            gameOverBest: animSheetList.gameoverBest[_LANG_CODE],
            gameOverHighscore: animSheetList.gameoverHighscore[_LANG_CODE],
            gamePausedScreen: animSheetList.screenPause[_LANG_CODE],
            gameCompletedScreen: animSheetList.screenGamecompleted[_LANG_CODE],
            storage: new ig.Storage(),
            parallax: null,
            bombsCount: 0,
            activateBombing: false,
            init: function () {
                ig.input.bind(ig.KEY.UP_ARROW, "up");
                ig.input.bind(ig.KEY.MOUSE1, "click");
                ig.input.bind(ig.KEY.ENTER, "ok");
                ig.input.bind(ig.KEY.P, "pause");
                ig.input.bind(ig.KEY.B, "bomb");
                ig.input.bind(ig.KEY.C, "cheat code");
                this.secondsTimer = new ig.Timer(1);
                this.gameOverRunOnce = false;
                this.parallax = new Parallax();
                this.parallax.add(this.background.path, { distance: 5, y: 0 });
                this.parallax.add(this.stars.path, { distance: 2, y: 0 });
                this.player = this.spawnEntity(EntityPlayer, 40, 72);
                this.UIShield = this.spawnEntity(EntityUIShield, 55, 5);
                this.UIScore = this.spawnEntity(EntityUIScore, ig.system.width - 205 - 47 - 5, 5);
                this.BtnPause = this.spawnEntity(EntityButtonPause, ig.system.width - 47 - 47 - 5, 5);
                this.BtnAudio = this.spawnEntity(EntityButtonAudio, ig.system.width - 47, 5);
                this.BtnBomb = this.spawnEntity(EntityButtonBomb, 5, 5);
                if (ig.Sound.enabled) {
                    this.BtnAudio.currentAnim = this.BtnAudio.anims["true"];
                } else {
                    this.BtnAudio.currentAnim = this.BtnAudio.anims["false"];
                }
                this.newItemTable();
                ig.game.player.vel.y = 0;
                this.oldHighscore = ig.game.storage.get("rogers-highscore");
                this.settingTheScore = false;
            },
            placeEntity: function (entity) {
                var x = ig.system.width + 50;
                var y = Math.random() * ig.system.height;
                var item = this.spawnEntity(entity, x, y);
                item.speed = ig.game.speed + (Math.random() * ig.game.speed) / 2 - (Math.random() * ig.game.speed) / 2;
                if (y > ig.system.height - item.size.y) item.pos.y = ig.system.height - item.size.y;
            },
            shuffleArray: function (array) {
                var len = array.length;
                var i = len;
                while (i--) {
                    var p = parseInt(Math.random() * len);
                    var t = array[i];
                    array[i] = array[p];
                    array[p] = t;
                }
            },
            newItemTable: function () {
                this.entityItemTable = [];
                this.entityItemTable.push(EntityItemMine);
                this.entityItemTable.push(EntityItemStar);
                this.entityItemTable.push(EntityItemShield);
                this.entityItemTable.push(EntityItemMine);
                this.entityItemTable.push(EntityItemStar);
                this.entityItemTable.push(EntityItemShield);
                this.entityItemTable.push(EntityItemBomb);
                for (var i = 0; i < 33; i++) {
                    this.entityItemTable.push(EntityAsteroid);
                }
                this.shuffleArray(this.entityItemTable);
            },
            update: function () {
                if (this.score >= this.maxScore) {
                    if (!this.BtnCompleted) {
                        this.BtnCompleted = this.spawnEntity(EntityButtonBack, ig.system.width - 186 - 10, ig.system.height - 58 - 10);
                    }
                    this.BtnCompleted.update();
                } else if (this.gamePaused) {
                    if (!this.BtnRestart) this.BtnRestart = this.spawnEntity(EntityButtonRestart, 10, ig.system.height - 58 - 10);
                    if (!this.BtnBack) this.BtnBack = this.spawnEntity(EntityButtonBack, ig.system.width - 186 - 10, ig.system.height - 58 - 10);
                    this.BtnRestart.update();
                    this.BtnBack.update();
                    if (ig.input.pressed("click")) {
                        this.gamePaused = false;
                        ig.game.player.vel.y = 0;
                        this.BtnBack.kill();
                        this.BtnRestart.kill();
                    }
                } else if (this.gameOver) {
                    if (!this.BtnRestart) this.BtnRestart = this.spawnEntity(EntityButtonRestart, 10, ig.system.height - 58 - 10);
                    if (!this.BtnBack) this.BtnBack = this.spawnEntity(EntityButtonBack, ig.system.width - 186 - 10, ig.system.height - 58 - 10);
                    if (!this.BtnAudio) this.BtnAudio = this.spawnEntity(EntityButtonAudio, ig.system.width - 47, 5);
                    this.BtnRestart.update();
                    this.BtnBack.update();
                    this.BtnAudio.update();
                    var newHighscore = this.score.floor();
                    if (newHighscore > this.oldHighscore && !this.settingTheScore) {
                        ig.game.storage.setHighest("rogers-highscore", newHighscore);
                        this.settingTheScore = true;
                    }
                } else {
                    if (ig.input.pressed("ok")) {
                        ig.system.setGame(RogersGame);
                    } else {
                        if (ig.input.pressed("pause")) {
                            this.gamePaused = !this.gamePaused;
                        }
                        if (ig.input.pressed("bomb")) {
                            this.activateBombing = true;
                        }
                        if (ig.input.pressed("cheat code")) {
                            this.activateBombing = false;
                            this.BtnBomb.currentAnim = this.BtnBomb.anims["active"];
                            this.player.health = 100;
                            this.UIShield.currentAnim = this.UIShield.anims["100"];
                        }
                        this.speed += 0.0005;
                        this.score += ig.system.tick * this.speed * 5;
                        for (var i = 0; i < this.entities.length; i++) {
                            if (this.entities[i].type == ig.Entity.TYPE.B) this.entities[i].pos.x -= this.entities[i].speed;
                        }
                        this.tickCount = Math.ceil(this.score / 1000);
                        if (this.secondsTimer.delta() > 0) {
                            ig.game.seconds++;
                            this.secondsTimer.reset();
                            for (var i = 0; i < this.tickCount; i++) {
                                if (!this.entityItemTable.length) {
                                    this.newItemTable();
                                }
                                this.placeEntity(this.entityItemTable.pop());
                            }
                        }
                        this.parallax.move(40 * this.speed);
                        this.parent();
                        if (this.player.pos.y > ig.system.height + this.player.size.y) {
                            this.gameOver = true;
                            this.gameOverType = "offscreen";
                        }
                    }
                }
            },
            draw: function () {
                if (this.score >= this.maxScore) {
                    this.gameCompletedScreen.draw(0, 0);
                    if (this.BtnCompleted) this.BtnCompleted.draw();
                } else if (this.gamePaused) {
                    this.gamePausedScreen.draw(0, 0);
                    if (this.BtnRestart) this.BtnRestart.draw();
                    if (this.BtnBack) this.BtnBack.draw();
                } else if (this.gameOver) {
                    if (!this.gameOverRunOnce) {
                        var x = (ig.system.width - 254) / 2;
                        var y = (ig.system.height - 147) / 2 - 30;
                        switch (this.gameOverType) {
                            case "offscreen": {
                                this.gameOverScreenOffscreen.draw(x, y);
                                break;
                            }
                            case "asteroid": {
                                this.gameOverScreenAsteroid.draw(x, y);
                                break;
                            }
                            case "mine": {
                                this.gameOverScreenMine.draw(x, y);
                                break;
                            }
                            default: {
                            }
                        }
                        if (this.BtnRestart) this.BtnRestart.draw();
                        if (this.BtnBack) this.BtnBack.draw();
                        this.gameOverScore.draw(10, 80);
                        this.gameOverBest.draw(ig.system.width - 10 - 121, 80);
                        this.font.draw(this.score.floor().toString(), 115, 113, ig.Font.ALIGN.RIGHT);
                        var highscore = this.oldHighscore;
                        if (this.score > this.oldHighscore) {
                            this.gameOverHighscore.draw(ig.system.width - 22 - 96, 142);
                            var highscore = this.score.floor().toString();
                        }
                        this.font.draw(highscore, ig.system.width - 22, 112, ig.Font.ALIGN.RIGHT);
                        if (this.BtnRestart && this.BtnBack && this.BtnAudio) {
                            this.gameOverRunOnce = true;
                        }
                    }
                    if (this.BtnAudio) this.BtnAudio.draw();
                } else {
                    this.parallax.draw();
                    this.parent();
                    this.UIShield.draw();
                    this.UIScore.draw();
                    this.BtnPause.draw();
                    this.BtnAudio.draw();
                    this.BtnBomb.draw();
                }
            },
        });
        StartScreen = ig.Game.extend({
            clearColor: null,
            font: new ig.Font("media/telemarines.font.png"),
            background: new ig.Image("media/img/deepspace.png"),
            stars: new ig.Image("media/img/stars.png"),
            ship: new ig.Image("media/img/cover-ship.png"),
            logo: new ig.Image("media/img/cover-logo.png"),
            title: new ig.Image("media/img/cover-title.png"),
            bestScore: animSheetList.gameoverBest[_LANG_CODE],
            storage: new ig.Storage(),
            counter: 0,
            parallax: null,
            init: function () {
                getOrRefreshLanguage();
                this.storage.initUnset("rogers-highscore", 0);
                ig.input.bind(ig.KEY.SPACE, "start");
                ig.input.bind(ig.KEY.ENTER, "start");
                ig.input.bind(ig.KEY.MOUSE1, "click");
                ig.input.bind(ig.KEY.H, "howTo");
                this.parallax = new Parallax();
                this.parallax.add(this.background.path, { distance: 5, y: 0 });
                this.parallax.add(this.stars.path, { distance: 2, y: 0 });
                this.BtnStart = this.spawnEntity(EntityButtonStart, ig.system.width - 183 - 10, ig.system.height - 60 - 10);
                this.BtnFacebook = this.spawnEntity(EntityButtonFacebook, ig.system.width - 66 - 10, 10);
                this.BtnAudio = this.spawnEntity(EntityButtonAudio, ig.system.width - 130, 10);
                this.BtnBlackmoon = this.spawnEntity(EntityButtonBlackmoon, 10, 10);
                this.BtnEnclave = this.spawnEntity(EntityButtonEnclave, 55, 10);
                if (!ig.ua.iOS && ig.game.storage.isCapable()) {
                    ig.Sound.enabled = ig.game.storage.get("rogers-audio");
                }
                //ig.music.add("media/audio/theme-music.*");
                ig.music.add("media/audio/short-mario.*");
                ig.music.volume = 0.7;
                if (ig.Sound.enabled) {
                    ig.music.play();
                    this.BtnAudio.currentAnim = this.BtnAudio.anims["true"];
                } else {
                    this.BtnAudio.currentAnim = this.BtnAudio.anims["false"];
                }
                this.oldHighscore = ig.game.storage.get("rogers-highscore");
            },
            update: function () {
                if (ig.input.pressed("start")) {
                    ig.system.setGame(StoryScreen);
                } else if (ig.input.pressed("howTo")) {
                    ig.system.setGame(HowToScreen);
                }
                this.counter++;
                this.parallax.move(40);
                this.parent();
            },
            draw: function () {
                this.parent();
                this.parallax.draw();
                this.BtnStart.draw();
                this.BtnEnclave.draw();
                this.BtnBlackmoon.draw();
                this.BtnFacebook.draw();
                this.BtnAudio.draw();
                var range = ((this.counter / 3) % 60) - 30;
                var delta = range > 0 ? 1 : -1;
                var tick = range * delta;
                this.ship.draw(-30, ig.system.height - this.ship.height + tick + 10);
                this.logo.draw((ig.system.width - this.logo.width) / 2, 10);
                this.title.draw((ig.system.width - this.title.width + 160) / 2, 100);
                this.bestScore.draw(10, ig.system.height - 10 - 50);
                this.font.draw(this.oldHighscore, 70, ig.system.height - 28, ig.Font.ALIGN.CENTER);
            },
        });
        StoryScreen = ig.Game.extend({
            story: animSheetList.screenStory[_LANG_CODE],
            buttonContinue: animSheetList.buttonContinueImg[_LANG_CODE],
            init: function () {
                ig.input.bind(ig.KEY.SPACE, "start");
                ig.input.bind(ig.KEY.ENTER, "start");
                this.BtnContinue = this.spawnEntity(EntityButtonContinueHowTo, ig.system.width - 132 - 10, ig.system.height - 43 - 10);
            },
            update: function () {
                if (ig.input.pressed("start")) {
                    ig.system.setGame(HowToScreen);
                }
                if (!this.BtnContinue) this.BtnContinue = this.spawnEntity(EntityButtonContinueHowTo, ig.system.width - 132 - 10, ig.system.height - 43 - 10);
                this.BtnContinue.update();
                this.parent();
            },
            draw: function () {
                this.parent();
                this.story.draw(0, 0);
                if (this.BtnContinue) this.BtnContinue.draw();
            },
        });
        HowToScreen = ig.Game.extend({
            howTo: animSheetList.screenHowto[_LANG_CODE],
            buttonContinue: animSheetList.buttonContinueImg[_LANG_CODE],
            init: function () {
                ig.input.bind(ig.KEY.SPACE, "start");
                ig.input.bind(ig.KEY.ENTER, "start");
                ig.input.bind(ig.KEY.H, "howTo");
                this.BtnContinue = this.spawnEntity(EntityButtonContinueGame, ig.system.width - 132 - 10, ig.system.height - 43 - 10);
            },
            update: function () {
                if (ig.input.pressed("howTo")) {
                    ig.system.setGame(StartScreen);
                }
                if (ig.input.pressed("start")) {
                    ig.system.setGame(RogersGame);
                }
                if (!this.BtnContinue) this.BtnContinue = this.spawnEntity(EntityButtonContinueGame, ig.system.width - 132 - 10, ig.system.height - 43 - 10);
                this.BtnContinue.update();
                this.parent();
            },
            draw: function () {
                this.parent();
                this.howTo.draw(0, 0);
                if (this.BtnContinue) this.BtnContinue.draw();
            },
        });
        if (ig.ua.iOS) {
            ig.Sound.enabled = false;
        }
        checkOrientation = function () {
            if (ig.ua.mobile && (window.orientation == 0 || window.orientation == 180)) {
                document.getElementById("portrait").style.display = "block";
                document.getElementById("game").style.display = "none";
            } else {
                document.getElementById("portrait").style.display = "none";
                document.getElementById("game").style.display = "block";
            }
        };
        if (ig.ua.mobile && (window.orientation == 0 || window.orientation == 180)) {
            document.getElementById("portrait").style.display = "block";
            document.getElementById("game").style.display = "none";
        }
        function hideURLbar() {
            if (window.location.hash.indexOf("#") == -1) {
                window.scrollTo(0, 1);
            }
            ig.CanvasCSS3Scaling.reflow();
        }
        if (navigator.userAgent.indexOf("iPhone") != -1 || navigator.userAgent.indexOf("Android") != -1) {
            addEventListener(
                "load",
                function () {
                    setTimeout(hideURLbar, 0);
                    setTimeout(ig.CanvasCSS3Scaling.reflow, 50);
                },
                false
            );
        }
        window.addEventListener("orientationchange", checkOrientation);
        ig.CanvasCSS3Scaling = new CanvasCSS3Scaling();
        ig.CanvasCSS3Scaling.init();
        ig.main("#canvas", StartScreen, 30, 480, 320, 1, ig.ImpactSplashLoader);
    });
(function () {
    function handleVisibilityChange() {
        if (document.hidden) {
            if (ig && ig.music && ig.Sound) {
                if (ig.Sound.enabled) {
                    ig.music.pause();
                }
            }
        } else {
            if (ig && ig.music && ig.Sound) {
                if (ig.Sound.enabled) {
                    ig.music.play();
                }
            }
        }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange, false);
})();
