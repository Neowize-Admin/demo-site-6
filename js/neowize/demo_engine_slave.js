/**
* Slave-side logic, eg pages inside the iframe.
* To learn more about master-slave relationship, read the comment in demo_engine_shared.js.
*
* Author: Ronen Ness.
* Since: 2016.
*/

/// NOTE!!! keep in mind that this code is called per page-load, inside the iframe scope.
(function() {

    // add "this is not a real store" tag to cart and other places.
    setTimeout(function() {
        var elem = $('<div class="alert alert-warning" role="alert">Note: this is a demo site to show NeoWize features. Orders will not be respected.  For more info, visit <a target="_blank" href="http://neowize.com">Neowize.com</a>.</div>');
        $(".contact-grids").prepend(elem);
        $(".check-out").find("h1").after(elem);
    }, 100);

    // check if we are inside an iframe
    function inIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    // when clicking on category button
    window.categoryClick = function(elem) {

        // get category id
        var category = elem.id.split("-")[1];

        // get url dictionary to replace category id param
        var urlDict = new UrlDict();
        urlDict.GET.set("cat", category);

        // replace url
        urlDict.setBaseUrl("products.html");

        // update url
        location.href = urlDict.toUrl();
    }

    // init on page load.
    $(document).ready(function()
    {
        // if we are not inside an iframe, load the loader instead with out url as the hash param
        // this is to make sure that if someone opens a link in other tab we won't be loaded outside the iframe and show
        // a broken demo, eg a default page with basic items instead of NeoWize's items
        if (!inIframe())
        {
            location.href = "index.html#" + location.href;
            return;
        }

        // get current category id
        var category = new UrlDict().GET.get("cat");

        // if category defined for this page
        if (category)
        {
            // set category title text
            var categoryFixedNames = {
                Bottoms: "Pants & Skirts",
            };
            $("h1").text(categoryFixedNames[category] || category);

            // set active class to the current category link
            $('#cat-' + category).addClass("active");
        }

        // notify parent about current page loaded
        DemoSite.postToParent("page_loaded", location.host.length > 4 ? location.href.split(location.host)[1] : location.href);

        // hide all items. they will be displayed later once loaded from master
        $(".simpleCart_shelfItem").not(".single-para").hide();
    });

    // replace x items elements with given products data list.
    function replaceItems(elements, productsData)
    {
        // aliases
        var itemContainers = elements;
        var products = productsData;

        // iterate items and set data from products list we got
        for (var i = 0; i < itemContainers.length; ++i)
        {
            // get current element and product data
            var curr = $(itemContainers[i]);
            var product = products[i];

            // no product data found?
            if (!product)
            {
                console.warn("Not enough products data provided for 'set_products' call!");
                break;
            }

            // set image
            var links = curr.find("a").not(".item_add");
            //links.attr("href", "single.html?id=" + product.product_id);
            links.unbind('click').click(function() {DemoSite.postToParent("clicked_on_item", $(this).data('prodid'));});
            $(curr.find("a")[1]).text(DemoSite.DEBUG ? product.product_id + ",  --  " + product.name : product.name);
            curr.find(".item_price").text("$" + product.price);
            curr.find(".price-in1").text("$" + product.price);
            curr.find(".item_add").data('prodid', product.product_id);
            curr.find(".item_add").click(function(){ DemoSite.postToParent("added_item_to_cart", $(this).data('prodid')); });

            // set image
            var img = curr.find(".img-responsive");
            curr.css("min-height", curr.height() + "px");
            img.attr("src", DemoSite.MEDIA_ROOT + product.image);
            img.css("opacity", "0");
            (function(img, curr) {
                img[0].onload = function() {
                    $(this).css("opacity", "1");
                    curr.css("min-height", "0px");
                }
            })(img, curr);

            // show the product div
            curr.show();
        }
    }

    // register callback to replace items when asked by master
    // this is for every pages with products grid.
    DemoSite.messagesCallbacks["set_products"] = function(products)
    {
        // log message
        console.log("Got catalog:", products);

        // get all item containers
        var itemContainers = $(".simpleCart_shelfItem");

        // replace items
        replaceItems(itemContainers, products);
    }

    // create bottom buttons with current category page.
    DemoSite.messagesCallbacks["set_category_page"] = function(data)
    {
        // remove all previous page buttons
        $(".page-numbers").find("a").remove();

        // get pages count and current page
        var pagesCount = data.pagesCount;
        var currPage = data.pageIndex + 1; // <-- +1 is to return page index into 1 based

        // set page label
        $("#curr-page").text("Page " + currPage);

        // if provided pagesCount param, add page buttons
        var pageButtons = "";
        for (var i = 1; i <= pagesCount; ++i)
        {
            // calc url for this page
            var url = location.href.split("&p=")[0] + "&p=" + i;

            // current page button
            if (currPage === i)
            {
                pageButtons += "<a><span style='color: #fd6d52'>&nbsp; " + i + " &nbsp;</span></a>"
            }
            // handle all page buttons
            else
            {
                pageButtons += "<a href='" + url + "'>&nbsp; " + i + " &nbsp;</a>"
            }
        }

        // add next button
        if (currPage < pagesCount)
        {
            var url = location.href.split("&p=")[0] + "&p=" + (currPage + 1);
            pageButtons += "<a href='" + url + "'>&nbsp; Next &nbsp;</a>"
        }

        // add page buttons
        $(".page-numbers").append($(pageButtons));
    }

    // register callback to replace best-sellers items when asked by master.
    // this is for any pages that have best-sellers tag on the side.
    DemoSite.messagesCallbacks["set_best_sellers"] = function(products)
    {
        // log message
        console.log("Got best sellers:", products);

        // get all item containers
        var itemContainers = $(".product-go");

        // replace items
        replaceItems(itemContainers, products);
    }

    // register callback to replace main item data when asked by master.
    // this is for product-specific pages.
    DemoSite.messagesCallbacks["set_main_product"] = function(product)
    {
        // log message
        console.log("Got main product:", product);

        // get main container div and set product data
        var container = $(".single-para");
        container.find("h1").text(product.name);
        container.find("p").text(product.description);
        container.find(".item_price").text("$" + product.price);

        // now replace images
        // first get product images in a list (note: the media_galler also contain "primary" inside)
        var primary = product.image;
        var productImages = product.media_gallery;

        // iterate over images and replace them
        // note: it takes them some time to appear so we retry until they are ready.
        function update_big_imgs()
        {
            var images = $(".flexslider").find("img");
            if (images.length === 0) {return setTimeout(update_big_imgs, 100);}
            for (var i = 0; i < images.length; ++i)
            {
                var newUrl = DemoSite.MEDIA_ROOT + (product.media_gallery[i] || primary);
                $(images[i]).attr("src", newUrl);
            }
        }
        update_big_imgs();

        // now set thumbnails
        // note: it takes them some time to appear so we retry until they are ready.
        function update_thumbnails()
        {
            var images = $(".flex-control-thumbs").find("img");
            if (images.length === 0) {return setTimeout(update_thumbnails, 100);}
            for (var i = 0; i < images.length; ++i)
            {
                var newUrl = DemoSite.MEDIA_ROOT + (product.media_gallery[i] || primary);
                $(images[i]).attr("src", newUrl);
            }
        }
        update_thumbnails();

    }
})();