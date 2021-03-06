var Flake = function() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.width = 0;
    this.height = 0;
    this.maxVelocity = 0;
    this.size = 0;
    this.elem = null;
    this.position = null;
    this.tweet = null;
    this.angle = 0;
    this.rotation = 0;
    this.rotationDir = "";
    this.rotationSpeed = 0;
    this.dying = false;
    this.dead = false;
    this.tweetVisible = false;
    this.processedTweet = null;
    this.maxVx = 0;
}

Flake.prototype = {
    spawn: function(options) {
        this.tweet = options.tweet;

        this.x = options.x;
        this.y = options.y;
        this.size = options.size;
        this.angle = Math.random() * 2*Math.PI;

        // how fast the flake will complete its rotary cycle, e.g. how fast it switches from left to right movement
        this.rotation = 0.005 + Math.random() * 1.5;

        // a little bit of vertical spice
        // we've de-spiced a lot so users can see their tweets quicker. Boring.
        this.vy = 0.1 + Math.random() * 2;

        this.maxVx = 15 + Math.random() * 40;

        this.maxVelocity = 8 + Math.random() * 22;
        this.rotationDir = Math.floor(Math.random()*2) ? "clockwise" : "anticlockwise";
        this.rotationSpeed = 8 + Math.floor(Math.random()*24);

        if (this.tweet.text.search(/#nodeflakes/i) != -1) {
            SoundManager.playSound('nodeflake');
            content = "<div class='node flake'>&#10052;</div>";
            if (this.size < 20) {
                this.y -= 20 - this.size;
                this.size = 20;
            }
            // reset X
            var v = Engine.getViewport();
            // dead centre
            this.x = (v.w / 2) - (this.size / 2);
            // +/- 50% width
            this.x += -(v.w / 4) + ((v.w / 2) * Math.random());
        } else {
            // 10052 and 10053 are unicode snowflake indices
            var fIndex = 10052 + Math.floor(Math.random()*2);
            content = "<div class='flake'>&#"+fIndex+";</div>";
        }
        this.elem = $(
            content
        ).css({
            "left": this.x,
            "top": this.y,
            "font-size": this.size+"px"
        });

        
        if (Engine.setting('animations')) {
            this.animate();
        }

        if (Engine.setting('acceleration')) {
            this.elem.addClass('threedee');
        }


        Engine.getElement().append(this.elem);

        this.width = this.elem.width();
        this.height = this.elem.height();
        this.position = this.elem.get(0).style;

        // this is less than ideal, but since size != height anymore, we have to re-adjust that a bit
        // really, you'd want the engine to do this, but it doesn't know about our internal *actual* w / h
        if (this.height > this.size) {
            var adjust = this.height - this.size;
            this.position.top -= adjust;
        }

        // wire up hover handlers
        var that = this;

        // we could change this to $("body").delegate(".flake") - might be faster?
        // but we'll have to attach a reference to our flake somehow if so.
        this.elem.mouseover(function(e) {
            if (!that.isTweetVisible()) {
                that.showTweet();
            }
        });

    },

    animate: function() {
        this.elem.css({
            "-webkit-animation-name": "rotate-"+this.rotationDir,
            "-webkit-animation-duration": this.rotationSpeed+"s",
            "animation-name": "rotate-"+this.rotationDir,
            "animation-duration": this.rotationSpeed+"s"
        }).addClass("animated");
    },

    tick: function(delta) {
        this.x += this.vx * delta;
        this.y += this.vy * delta;

        // NB no delta on the (horribly hard coded) velocity, since when we actually
        // add vx to the current position, we account for delta there. So, this value
        // will be capped from 0 - 40 based on the angle.
        this.vx = Math.cos(this.angle) * (this.maxVx);

        // @todo move this hard coded acceleration value
        this.vy += 5 * delta;

        if (this.vy > this.maxVelocity) {
            this.vy = this.maxVelocity;
        }

        this.angle += this.rotation * delta;
    },
    
    kill: function() {
        this.dying = false;
        this.dead = true;
        this.elem.remove();
    },

    render: function() {
        this.position.left = (this.x | 0) + "px";
        this.position.top = (this.y | 0) + "px";
    },

    getBottom: function() {
        return this.y + this.height;
    },

    getRight: function() {
        return this.x + this.width;
    },

    isDying: function() {
        return this.dying;
    },

    isDead: function() {
        return this.dead;
    },

    isWithinViewport: function(viewport) {
        // we only care about y for now
        return (this.getBottom() >= viewport.y && this.y <= (viewport.y + viewport.h));
    },

    startDeath: function(fadeTime) {
        this.dying = true;
        var that = this;
        this.elem.fadeOut(fadeTime, function() {
            that.kill();
        });
    },
    
    getProjectedBottom: function(msec) {
        return this.getBottom() + (this.vy * (msec/1000));
    },

    isTweetVisible: function() {
        return this.tweetVisible;
    },

    showTweet: function() {
        this.tweetVisible = true;
        // render it
        var elem = $(
            "<div class='tweet'></div>"
        ).html(
            this.renderTweet()
        ).hide();

        Engine.getElement().append(elem);

        var position = {
            "left": 0,
            "top" : 0
        };

        // ensure tweet is rendered within bounds

        // ideally we want the tweet to render half way down the flake
        var idealTop = this.y + (this.height / 2) - (elem.height() / 2);
        if (idealTop >= 0) {
            // but only if it keeps the whole tweet on screen
            position.top = idealTop;
        }

        // by default we want to render the tweet 20px to the right of the flake
        if (this.getRight() + elem.width() + 20 < Engine.getViewport().x + Engine.getViewport().w) {
            position.left = this.getRight() + 20;
        } else {
            // but if that's not possible, settle for left instead
            position.left = this.x - 20 - elem.width();
        }

        elem.css(position);

        // this looks worse than it is, it's just a chain of callbacks to
        // 1. show the tweet
        // 2. fade out the tweet
        // 3. remove the tweet from DOM and set the isVisible boolean back to false
        var that = this;
        var fadeSpeed = 500;
        var showTime = 2500;
        elem.fadeIn(fadeSpeed, function() {
            setTimeout(function() {
                elem.fadeOut(fadeSpeed, function() {
                    elem.remove();
                    that.tweetVisible = false;
                });
            }, showTime);
        });
    },

    renderTweet: function() {
        if (this.processedTweet == null) {
            var text = this.tweet.text;
            var str = "<a class='author' href='http://twitter.com/"+this.tweet.user.screen_name+"'>"+this.tweet.user.screen_name+"</a>: ";

            var photo = null;

            var i = this.tweet.entities.length;
            while (i--) {
                var entity = this.tweet.entities[i];
                var start = entity.indices[0];
                var end = entity.indices[1];

                var insert = "";
                switch (entity.eType) {
                    case 'urls':
                        var url = entity.display_url || entity.url
                        insert = "<a class='url' href='"+entity.url+"'>"+url+"</a>";
                        break;

                    case 'media':
                        var url = entity.display_url || entity.media_url
                        insert = "<a class='url' href='"+entity.media_url+"'>"+url+"</a>";

                        if (entity.type == 'photo' && photo == null) {
                            photo = "<img class='photo' src='"+entity.media_url+":thumb' alt='' />";
                        }
                        break;

                    case 'user_mentions':
                        insert = "<a class='mention' href='http://twitter.com/"+entity.screen_name+"'>"+text.substring(start, end)+"</a>";
                        break;

                    case 'hashtags':
                        insert = "<strong class='hashtag'>"+text.substring(start, end)+"</strong>";
                        break;

                    default:
                        break;
                }

                text = text.substring(0, start) + insert + text.substring(end);
            }
            str += text;

            if (photo) {
                str = photo+str;
            }

            this.processedTweet = str;
        }
        return this.processedTweet;
    }
};
