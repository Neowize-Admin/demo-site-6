/**
* The demo pages are built as a loader html that load specific pages inside an iframe and controls them from outside.
* All the catalog and NeoWize logic is inside the container html, while the internal pages inside the iframe are used
* as a passive store template that render products.
*
* We will refer to the loader page as 'master' and internal template pages (inside the iframe) as 'slaves'.
*
* This file contains basic utilities and functions for master-slave communication.
*
* Author: Ronen Ness.
* Since: 2016.
*/
(function() {

    // send google analytics
    try
    {
        (function() {

            // get google analytics
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

            // init and send visit
            ga('create', 'UA-77559646-1', 'auto');
            ga('send', 'pageview');

            // attach ga to global scope
            window.ga = ga;

        })();
    }
    catch (e)
    {
        console.warn("Error with google analytics!", e);
        window.ga = function() {};
    }
    
    // init mix-max panels
    try
    {
        (function(e,a){if(!a.__SV){var b=window;try{var c,l,i,j=b.location,g=j.hash;c=function(a,b){return(l=a.match(RegExp(b+"=([^&]*)")))?l[1]:null};g&&c(g,"state")&&(i=JSON.parse(decodeURIComponent(c(g,"state"))),"mpeditor"===i.action&&(b.sessionStorage.setItem("_mpcehash",g),history.replaceState(i.desiredHash||"",e.title,j.pathname+j.search)))}catch(m){}var k,h;window.mixpanel=a;a._i=[];a.init=function(b,c,f){function e(b,a){var c=a.split(".");2==c.length&&(b=b[c[0]],a=c[1]);b[a]=function(){b.push([a].concat(Array.prototype.slice.call(arguments,
        0)))}}var d=a;"undefined"!==typeof f?d=a[f]=[]:f="mixpanel";d.people=d.people||[];d.toString=function(b){var a="mixpanel";"mixpanel"!==f&&(a+="."+f);b||(a+=" (stub)");return a};d.people.toString=function(){return d.toString(1)+".people (stub)"};k="disable time_event track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config reset people.set people.set_once people.increment people.append people.union people.track_charge people.clear_charges people.delete_user".split(" ");
        for(h=0;h<k.length;h++)e(d,k[h]);a._i.push([b,c,f])};a.__SV=1.2;b=e.createElement("script");b.type="text/javascript";b.async=!0;b.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===e.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";c=e.getElementsByTagName("script")[0];c.parentNode.insertBefore(b,c)}})(document,window.mixpanel||[]);
        mixpanel.init("ee6dbdb3d4d31bdc48b83fd649682c81");        
    }
    catch (e)
    {
        console.warn("Error with mixmax!", e);
    }

    // get debug mode from url
    var DEBUG_MODE = location.href.indexOf("neowize_debug=") !== -1;

    // namespace for demo site stuff
    window.DemoSite = {

        // media files root url
        MEDIA_ROOT: "https://s3-eu-west-1.amazonaws.com/shoptimally-ire/demo-store/",

        // how many items we want to show per catalog page
        ITEMS_PER_PAGE: DEBUG_MODE ? 500 : 9,

        // how many maximum items we allow in total per category (3 pages)
        MAX_ITEMS_PER_CATEGORY: DEBUG_MODE ? 10000000 : 9 * 3,

        // set to debug mode (show extra data on page etc.)
        DEBUG: DEBUG_MODE,

        // report user event to google analytics
        gaEvent: function(action)
        {
            window.ga('send', 'event', "user_event", action, location.host);
        },

        // post message to parent
        postToParent: function(msg_type, data)
        {
            try {
                if (window.parent) {
                    window.parent.postMessage(JSON.stringify({type: msg_type, data: data}), '*');
                }
                else {
                    console.warn("Cannot post message to parent, because window.parent is undefined.");
                }
            }
            catch (e) {
                console.warn("Failed to post message to parent!", e);
            }
        },

        // post message to child
        postToChild: function(msg_type, data)
        {
            try {
                var element = document.getElementById("site-content-frame");
                if (element) {
                    element.contentWindow.postMessage(JSON.stringify({type: msg_type, data: data}), '*');
                }
                else {
                    console.warn("Cannot post message to child, because iframe cannot be found.");
                }
            }
            catch (e) {
                console.warn("Failed to post message to child!", e);
            }
        },

        // receive message from parent / child
        receiveMessage: function(event)
        {
            // parse message data
            try
            {
                var data = JSON.parse(event.data);
            }
            // report errors
            catch (e)
            {
                console.warn("Failed to parse message: ", event.data);
                return;
            }

            // get callback
            var callback = DemoSite.messagesCallbacks[data.type];

            // no callback for this message type?
            if (!callback)
            {
                console.warn("No callback for message type: ", data.type, " with data: ", data.data);
                return;
            }

            // call callback with data
            callback(data.data);
        },

        // dictionary with callbacks to invoke on different messages
        messagesCallbacks: {},
    };

    // register the receive message callback
    window.addEventListener('message', DemoSite.receiveMessage);

    // update source url of all catalog images
    $(document).ready(function()
    {
        var catImages = $(".catalog-img");
        for (var i = 0; i < catImages.length; ++i)
        {
            catImages[i].src = DemoSite.MEDIA_ROOT + catImages[i].dataset.src;
        }
    });

})();