var Engine = (function(win, doc) {
    var that = {};

    var _flakes = [],
        _delta = 0,
        _lastTick = 0,
        _tickTime = 0,
        _height = 0,
        _viewport = {
            x: 0,
            y: 0,
            w: 0,
            h: 0
        },
        _element = null,
        _settings = {
            snowflakes: true,
            sounds: true,
            animations: true,
            acceleration: true
        },
        _lastWeatherReport = null,
        _reportInterval = 4000,
        _flakesSinceReport = 0,
        _weatherLevels = {
            "0":  "none",
            "2":  "light",
            "5":  "medium",
            "9": "heavy",
            "14": "blizzard"
        },
        _maxFlakes = 300,
        _win = $(win);

    that.addRandomlyPositionedTweet = function(data) {
        var size = Math.round(8 + (data.user.followers_count / 100));
        if (size > 250) {
            size = 250;
        }

        var x = Math.floor(
            10 + Math.random() * _win.width() - size - 20
        );

        // we used to make Y a bit random, but if users are looking out for their tweets
        // then having a negative Y makes things look less realtime
        var y = -size;

        var flake = new Flake();
        flake.spawn({
            "x": x,
            "y": y,
            "tweet": data,
            "size": size
        });

        _flakes.push(flake);
        _flakesSinceReport ++;
        var j = _flakes.length;
        if (j > _maxFlakes) {
            var f;
            for (var i = 0; i < j; i++) {
                f = _flakes[i];
                if (f.isDying() || f.isDead()) {
                    continue;
                }
                f.startDeath(1000);
                break;
            }
        }
    };

    that.loop = function() {
        _tickTime = new Date().getTime();
        if (_tickTime >= _lastWeatherReport + _reportInterval) {
            // update!
            var _flakesPerSec = _flakesSinceReport / (_reportInterval / 1000);
            var weatherIndex;
            for (var i in _weatherLevels) {
                if (_flakesPerSec <= i) {
                    weatherIndex = i;
                    break;
                }
            }
            if ($("#weather span").html() != _weatherLevels[weatherIndex]) {
                $("#weather span").fadeOut(500, function() {
                    $(this).html(_weatherLevels[weatherIndex]).fadeIn(500);
                });
            }
            _flakesSinceReport = 0;
            _lastWeatherReport = _tickTime;
        }
        // we want a delta in *seconds*, to make it easier to scale our values
        _delta = (_tickTime - _lastTick) / 1000;
        _lastTick = _tickTime;

        that.tick();
        that.render();
    };

    that.tick = function() {
        if (!_settings.snowflakes) {
            return;
        }
        var i = _flakes.length,
            flake;
        while (i--) {
            flake = _flakes[i];
            flake.tick(_delta);

            if (!flake.isDying() && flake.getProjectedBottom(3000) >= _height) {
                flake.startDeath(2000);
            }

            if (flake.isDead()) {
                _flakes.splice(i, 1);
            }
        }
    };

    that.render = function() {
        var i = _flakes.length;
        while (i--) {
            //if (_flakes[i].isWithinViewport(_viewport)) {
                _flakes[i].render();
            //}
        }
    };

    that.updateViewport = function() {
        _viewport.x = _win.scrollLeft();
        _viewport.y = _win.scrollTop();
        _viewport.w = _win.width();
        _viewport.h = _win.height();
    };

    that.addControlPanel = function() {
        that.getElement().prepend(
            "<div id='actions'>"+
                "<span>Current snowfall: <span id='weather'><span>none</span></span>"+
                "<a class='snowflakes' href='#'>Snowflakes: <span>on</span></a>"+
                "<a class='sounds' href='#'>#nodeflakes sounds: <span>on</span></a>"+
                "<a class='animations' href='#'>CSS Animations: <span>on</span></a>"+
                "<a class='acceleration' href='#'>3D Acceleration: <span>on</span></a>"+
            "</div>"
        );
        $("#actions a").click(function(e) {
            e.preventDefault();
            var setting = $(this).attr('class');
            _settings[setting] = !_settings[setting];
            var enabled = _settings[setting];

            switch (setting) {
                case 'snowflakes':
                    if (enabled) {
                        Client.reconnect();
                        $(".flake").show();
                    } else {
                        Client.disconnect();
                        $(".flake").hide();
                    }
                    break;

                case 'sounds':
                    if (enabled) {
                        SoundManager.unmute();
                    } else {
                        SoundManager.mute();
                    }
                    break;

                case 'animations':
                    if (enabled) {
                        var j = _flakes.length;
                        while (j--) {
                            _flakes[j].animate();
                        }
                    } else {
                        $(".flake").removeClass("animated").css({
                            "-webkit-animation-name": "",
                            "-webkit-animation-duration":""
                        });
                    }
                    break;

                case 'acceleration':
                    if (enabled) {
                        $(".flake").addClass("threedee");
                    } else {
                        $(".flake").removeClass("threedee");
                    }
                    break;
            }

            $(this).children("span").html(enabled ? "on" : "off");
        });
    };

    that.start = function() {
        _lastWeatherReport = new Date().getTime();
        _element = $("body");
        that.addControlPanel();
        _height = $(doc).height();

        that.updateViewport();

        _win.scroll(function(e) {
            that.updateViewport();
        });
        _win.resize(function(e) {
            that.updateViewport();
        });

        tick();
    };

    that.getElement = function() {
        return _element;
    };

    that.getViewport = function() {
        return _viewport;
    };

    that.setting = function(setting) {
        return !!_settings[setting];
    };

    return that;

})(this, document);

var animFrame = null;

function tick() {
    animFrame = requestAnimFrame(tick);
    Engine.loop();
}
