/**
 * bootdialog
 *
 * MIT License
 */
(function (root, factory) {
    "use strict";

    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(["jquery", 'underscore', 'bootstrap', 'bootstrap.validator'], factory);

    } else if (typeof exports === "object") {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        require("boostrap");
        require("bootstrap.validator");
        module.exports = factory(require("jquery"), require("underscore"));

    } else {
        // Browser globals (root is window)
        if(typeof root.jQuery === 'undefined'){
            throw new Error(
                "jquery is not loaded. Get jquery (https://jquery.com/) and load this on your script."
            );
        }
        if(typeof _ === 'undefined'){
            throw new Error(
                "underscore is not loaded. Get underscore (http://underscorejs.org/) and load this on your script."
            );
        }

        root.bootdialog = factory(root.jQuery, _);
    }

}(this, function init($, _) {
    "use strict";

    if($.fn.modal === undefined){
        throw new Error(
            "$.fn.modal is not defined; please double check you have included " +
            "the Bootstrap JavaScript library. See http://getbootstrap.com/javascript/ " +
            "for more details."
        );
    }

    var heardoc = function(doc){
        var doc = doc.toString().replace(/(\n)/g, '').split('*')[1];
        return _.template(doc, {
            interpolate: /\{\{(.+?)\}\}/g
        });
    };

    // the base DOM structure needed to create a modal
    var tmpls = {
        dialog:
            heardoc(function(){/*
                <div class='bootdialog modal {{classes}}' tabindex='-1' role='dialog' aria-hidden='true'>
                    <div class='modal-dialog {{size}}'>
                        <div class='modal-content'>
                            <div class='modal-body'><div class='bootdialog-body'></div></div>
                        </div>
                    </div>
                </div>
            */}),

        header:
            heardoc(function(){/*
                <div class='modal-header'>
                    <h4 class='modal-title'>{{body}}</h4>
                </div>
            */}),

        footer:
            heardoc(function(){/* <div class='modal-footer'>{{body}}</div> */}),

        button:
            heardoc(function(){/* <button data-id='{{key}}' type='button' class='btn {{class_name}}'>{{label}}</button> */}),

        closeButton:
            "<button type='button' class='bootdialog-close-button close' data-dismiss='modal' aria-hidden='true'>&times;</button>",

        prompt:
            heardoc(function(){/*
                <form class="form" role="form">
                    <input class='bootdialog-input form-control' autocomplete='off' type='text' />
                </form>
            */})
    };

    var defaults = {
        // default language
        locale: "en",
        // show backdrop or not. Default to static so user has to interact with dialog
        backdrop: true,
        // animate the modal in/out
        animate: true,
        // additional class string applied to the top level dialog
        className: null,
        // whether or not to include a close button
        closeButton: false,
        // whether or not to enable ESC key
        escKey: true,
        // dialog container
        container: "body",
        // title of dialog
        title: "",
        //
        callback: false
    };

    /**
     * @private
     */
    function _t1(key){
        var locale = locales[defaults.locale];
        return locale ? locale[key] : locales.en[key];
    }

    var normalize = function(options){
        if(typeof options !== "object"){
            throw new Error("Please supply an object of options");
        }

        if(!options.message){
            throw new Error("Please specify a message");
        }

        // make sure any supplied options take precedence over defaults
        options = _.defaults(options, defaults);

        if(!options.buttons){
            options.buttons = [];
        }
        options.buttons = _(options.buttons).map(function(button, i){
            var className = (i == options.buttons.length - 1) ? "btn-primary" : "btn-default";

            return _.defaults(button, {
                label: i,
                className: className,
                callback: _.noop,
                cancel: false
            });
        });

        if(options.closeButton === true){
            options.closeButton = _.noop;
        }

        return options;
    };

    var makeOption = function(options){
        if(typeof options == 'string'){
            var message = options;
            options = {
                message: message
            };
        }

        return options;
    };

    var makeDeferred = function(data){
        if(_.isFunction(data)){
            data = data();
        }
        if(typeof data == 'object' && _.isFunction(data.promise)){
            return data;
        }

        var d = new $.Deferred();
        d.resolve(data);

        return d.promise();
    };

    var doCallback = function(e, dialog, callback, is_cancel){
        e.stopPropagation();
        e.preventDefault();

        if(_.isFunction(callback)){
            callback = callback(e, dialog);
        }

        makeDeferred(callback)
            .done(function(data){
                dialog.modal('hide');

                var deferred = dialog.data('deferred');
                is_cancel ? deferred.reject(data) : deferred.resolve(data);
            });
    };

    return {
        alert: function(options){
            options = makeOption(options);

            if(!options.buttons){
                var callback;
                if(options.callback){
                    callback = options.callback;
                    options.callback = undefined;
                }

                options.buttons = [{
                        label: 'OK',
                        className: 'btn-primary',
                        callback: makeDeferred(callback),
                    }];
            }

            return this.dialog(options);
        },

        confirm: function(options){
            options = makeOption(options);

            if(!options.buttons){
                var callback;
                if(options.callback){
                    callback = options.callback;
                    options.callback = undefined;
                }

                options.buttons = [{
                        label: 'Cancel',
                        cancel: true
                    }, {
                        label: 'OK',
                        callback: makeDeferred(callback),
                    }];
            }

            return this.dialog(options);
        },

        warning: function(options){
            options = makeOption(options);

            if(!options.buttons){
                var callback;
                if(options.callback){
                    callback = options.callback;
                    options.callback = undefined;
                }

                options.buttons = [{
                        label: 'Cancel',
                        cancel: true
                    }, {
                        label: 'OK',
                        className: 'btn-danger',
                        callback: makeDeferred(callback),
                    }];
            }

            return this.dialog(options);
        },

        prompt: function(options){
            if(typeof options != 'object'){
                options = {title: options};
            }

            options.message = tmpls.prompt({});
            options = makeOption(options);

            options.rules = [];
            options.callback = function($){
                return $('.bootdialog-input').val();
            };

            return this.form(options);
        },

        form: function(options){
            options = makeOption(options);

            if(!options.callback){
                throw new Error('callback is required.');
            }

            options.closeButton = false;

            if(!options.buttons){
                var callback = options.callback;
                options.callback = _.noop();

                options.buttons = [{
                        label: 'Cancel',
                        cancel: true
                    }, {
                        label: 'OK',
                        callback: function(e, dialog){
                            return dialog.find('form')
                                .validate(options.rules, callback);
                        }
                    }];
            }

            return this.dialog(options);
        },

        wait: function(options){
            if(typeof options != 'object'){
                throw new Error('options is must object.');
            }
            if(!options.message){
                throw new Error('message is required.');
            }
            if(!options.callback){
                throw new Error('callback is required.');
            }

            options.closeButton = false;
            options.escKey = false;
            options.buttons = [];

            return this.dialog(options);
        },

        dialog: function(options){
            options = normalize(options);

            var classes = [];
            if(options.animate){
                classes.push("fade");
            }
            if(options.className){
                classes.push(options.className);
            }

            var size = '';
            if(options.size === "large"){
                size = "modal-lg";
            } else if (options.size === "small") {
                size = "modal-sm";
            }

            var dialog = $(tmpls.dialog({
                    classes: classes.join(' '),
                    size: size
                })).data({
                    deferred: new $.Deferred()
                });

            // setup body message and title
            $.when(
                    makeDeferred(options.message),
                    makeDeferred(options.title)
                )
                .done(function(message, title){
                    // the remainder of this method simply deals with adding our
                    // dialogent to the DOM, augmenting it with Bootstrap's modal
                    // functionality and then giving the resulting object back
                    // to our caller
                    $(options.container).append(dialog);

                    var body = dialog.find(".modal-body");
                    body.find(".bootdialog-body").html(message);

                    var show_header = false;
                    if(title){
                        body.before(tmpls.header({body: title}));
                        show_header = true;
                    }

                    if(options.closeButton){
                        var closeButton = $(tmpls.closeButton);
                        if(show_header){
                            dialog.find(".modal-header").prepend(closeButton);
                        } else {
                            closeButton.css("margin-top", "-10px").prependTo(body);
                        }
                    }

                    // buttons & footer
                    var buttons = _(options.buttons).map(function(b, key){
                        return tmpls.button({key: key, class_name: b.className, label: b.label});
                    });
                    if(buttons.length > 0){
                        body.after(tmpls.footer({body: buttons.join('')}));
                    }

                    dialog.modal({
                        backdrop: options.backdrop ? "static": false,
                        keyboard: false,
                        show: true
                    });
                });

            /**
             * Bootstrap event listeners; used handle extra
             * setup & teardown required after the underlying
             * modal has performed certain actions
             */
            dialog.on("hidden.bs.modal", function(e){
                // ensure we don't accidentally intercept hidden events triggered
                // by children of the current dialog. We shouldn't anymore now BS
                // namespaces its events; but still worth doing
                if(e.target === this){
                    dialog.remove();
                }
            });

            dialog.on("shown.bs.modal", function(e){
                dialog.find(".btn-primary:first").focus();

                if(options.callback){
                    doCallback(e, dialog, options.callback, false);
                }
            });

            /**
             * Bootbox event listeners; experimental and may not last
             * just an attempt to decouple some behaviours from their
             * respective triggers
            if(options.backdrop !== "static"){
                // A boolean true/false according to the Bootstrap docs
                // should show a dialog the user can dismiss by clicking on
                // the background.
                // We always only ever pass static/false to the actual
                // $.modal function because with `true` we can't trap
                // this event (the .modal-backdrop swallows it)
                // However, we still want to sort of respect true
                // and invoke the escape mechanism instead
                dialog.on("click.dismiss.bs.modal", function(e){
                    // @NOTE: the target varies in >= 3.3.x releases since the modal backdrop
                    // moved *inside* the outer dialog rather than *alongside* it
                    if(dialog.children(".modal-backdrop").length){
                        e.currentTarget = dialog.children(".modal-backdrop").get(0);
                    }

                    if(e.target !== e.currentTarget){
                        return;
                    }

                    dialog.trigger("escape.close.bb");
                });
            }
             */

            /**
             * Standard jQuery event listeners; used to handle user
             * interaction with our dialog
             */
            dialog.on("click", ".modal-footer button", function(e){
                var id = $(this).data("id");
                var button = options.buttons[id];

                doCallback(e, dialog, button.callback, button.cancel);
            });

            if(options.closeButton){
                dialog.on("click", ".bootdialog-close-button", function(e){
                    doCallback(e, dialog, options.closeButton, true);
                });
            }

            if(options.escKey){
                dialog.on("keyup", function(e){
                    if(e.which !== 27){
                        return;
                    }
                    doCallback(e, dialog, options.escKey, true);
                });
            }

            return dialog.data('deferred').promise();
        },

        sleep: function(duration, data){
            var d = $.Deferred();
            setTimeout(d.resolve.bind(null, data), duration);

            return d.promise();
        }
    };
}));