/**
* Master-side logic, eg the iframe container.
* To learn more about master-slave relationship, read the comment in demo_engine_shared.js.
*
* Author: Ronen Ness.
* Since: 2016.
*/

// NOTE!!! keep in mind that all the code here is only called ONCE, when the demo loads (because this is the container code
// and users in demo navigate inside the iframe, meaning this code is loaded just once).
// unlike the slave code, which is called for every page load.
(function() {

    // init on page load
    $(document).ready(function()
    {
        // add the animateCss function to apply animate.css animations via js code
        $.fn.extend({
            animateCss: function (animationName) {
                var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
                this.addClass('animated ' + animationName).one(animationEnd, function() {
                    $(this).removeClass('animated ' + animationName);
                });
            }
        });

        // show the scanline effect when profile changes
        DemoSite.showScanEffect = function()
        {
            $("#scan-effect").stop(true).show().css("top", "-1000px").animate({"top": "2000px"}, 2000, "swing", function(){ $(this).hide(); });
        }

        // show cool animation to highlight top buttons
        DemoSite.highlightProfileButtons = function()
        {
            // animate "see site as" label
            $('#see-site-as').animateCss('tada');

            // animate profile buttons
            for (var i = 0; i < 4; ++i)
            {
                (function(i) {
                    setTimeout(function(){
                        $('#profile-' + i).animateCss('flip');
                    }, 800 * (i + 1));
                })(i);
            }
        }

        // if we already got a page in hash param, load it
        if (window.location.hash)
        {
            document.getElementById("site-content-frame").src = window.location.hash.substr(1);
        }

        // change current profile we see
        DemoSite.selectProfile = function(profileId)
        {
            // log new profile
            console.log("Set profile", profileId);

            // show the scan effect
            DemoSite.showScanEffect();

            // send event
            DemoSite.gaEvent('changed_profile');

            // set new profile and update profiles
            DemoSite.currProfile = profileId;
            setTimeout(function(){
                DemoSite.updateProductsGrid();
            }, 500);

            // update url so we'll remember current profile id
            DemoSite._slaveUrlDict.GET.set("profid", parseInt(profileId));
            location.hash = '#' + DemoSite._slaveUrlDict.toUrl();

            // cancel the profile buttons timely highlight
            if (DemoSite._profileButtonsHighlightTimer && profileId !== 0)
            {
                clearInterval(DemoSite._profileButtonsHighlightTimer);
                DemoSite._profileButtonsHighlightTimer = null;
            }
        };

        // update current products grid for demo site, based on category, page and profile
        DemoSite.updateProductsGrid = function()
        {
            // get current category id
            var category = DemoSite._slaveUrlDict.GET.get("cat");

            // get items per page and total per category
            var itemsPerPage = DemoSite.ITEMS_PER_PAGE;
            var itemsPerCategory = DemoSite.MAX_ITEMS_PER_CATEGORY;

            // if there's a category id, use it..
            if (category)
            {
                // get all products in category
                var allCategoryProducts = DemoSite.CatalogUtils.by_category[category];

                // get prioritized products for current category and profile
                var profileProds = DemoSite.currProfile ? DemoSite.ProfilesCatalog.getProducts(DemoSite.currProfile).suggested : [];

                // merge the prioritized ids with the original list we were about to show (note: this is BEFORE slicing for specific page index)
                // note: we first use slice() to create a copy of the list so we won't change the original catalog list
                allCategoryProducts = allCategoryProducts.slice();
                allCategoryProducts.sort(function(a, b) {
                    return (profileProds.indexOf(b.product_id) - profileProds.indexOf(a.product_id));
                });

                // slice just the max items per category count and calculate how many pages in category
                allCategoryProducts = allCategoryProducts.slice(0, itemsPerCategory);
                var pagesCount = Math.ceil(allCategoryProducts.length / itemsPerPage);

                // get current page index (note: its 1 based and we turn it 0 based) and products on specific page
                var pageIndex = (DemoSite._slaveUrlDict.GET.get("p") || 1) - 1;
                var pageProducts = allCategoryProducts.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);

                // log products
                console.log("Showing products for category ", category, " page ", pageIndex, " and profile ", DemoSite.currProfile);

                // set products and current page / pages count
                DemoSite.postToChild("set_products", pageProducts, pagesCount, pageIndex);
                DemoSite.postToChild("set_category_page", {pagesCount: pagesCount, pageIndex: pageIndex});
            }
            // no category id? return default items..
            else
            {
                DemoSite.postToChild("set_products", DemoSite.Catalog.slice(0, itemsPerPage));
            }
        };

        // register callback to respond when slave page (inside the iframe) is loaded
        DemoSite.messagesCallbacks["page_loaded"] = function(url)
        {
            // log message
            console.log("Page loaded:", url);

            // create url dictionary for child (slave) url, which is where we actually keep all the data (current category, page index, profile id...)
            var urlParams = new UrlDict(url);
            DemoSite._slaveUrlDict = urlParams;

            // get current profile id
            var profile = urlParams.GET.get("profid");

            // if home page, show intro popup
            if (urlParams.getBaseUrl().indexOf("store_index.html") !== -1)
            {
                // cancel the profile buttons timely highlight animation (if exist)
                if (DemoSite._profileButtonsHighlightTimer)
                {
                    clearInterval(DemoSite._profileButtonsHighlightTimer);
                    DemoSite._profileButtonsHighlightTimer = null;
                }

                // reset top-bar z-index to be under the modal background
                $(".top-bar").css("z-index", 100);

                // show intro
                $("#intro-modal").modal();
            }

            // if there's a profile id defined, highlight the button and select it
            if (profile)
            {
                $(".profile").removeClass("active");
                DemoSite.currProfile = parseInt(profile);
                $("#profile-" + profile).addClass("active");
            }
            // if there's no profile in child URL, but we already know the profile id, use it
            // this happens if clicking on categories link for example, which override the get params.
            else if (DemoSite.currProfile !== undefined)
            {
                profile = DemoSite.currProfile;
                urlParams.GET.set("profid", profile);
            }

            // set current url as the hash param of the parent url, so refresh will work without returning to index
            location.hash = '#' + urlParams.toUrl();

            // update main products grid
            DemoSite.updateProductsGrid();

            // set best sellers
            DemoSite.postToChild("set_best_sellers", DemoSite.CatalogUtils.by_category["Best Sellers"].slice(0, 20));

            // if its a specific-product page:
            if (url.indexOf("single.html") !== -1)
            {
                // get product id
                var id = urlParams.GET.get("id");

                // set current product data
                DemoSite.postToChild("set_main_product", DemoSite.CatalogUtils.by_id[id]);
            }
        };

        // register callback to respond when user click to add item to cart
        DemoSite.messagesCallbacks["added_item_to_cart"] = function(id)
        {
            DemoSite.gaEvent('clicked_on_item');
            $("#clicked-on-item").modal();
        };

        // register callback to respond when user click on an item
        DemoSite.messagesCallbacks["clicked_on_item"] = function(id)
        {
            DemoSite.gaEvent('clicked_on_item');
            $("#clicked-on-item").modal();
        };
    });
})();