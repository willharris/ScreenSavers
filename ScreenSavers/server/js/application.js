//# sourceURL=application.js

//
//  application.js
//  ScreenSavers
//
//  Created by William Harris on 16.11.2017.
//  Copyright © 2017 harris.ch. All rights reserved.
//

/*
 * This file provides an example skeletal stub for the server-side implementation 
 * of a TVML application.
 *
 * A javascript file such as this should be provided at the tvBootURL that is 
 * configured in the AppDelegate of the TVML application. Note that  the various 
 * javascript functions here are referenced by name in the AppDelegate. This skeletal 
 * implementation shows the basic entry points that you will want to handle 
 * application lifecycle events.
 */

/**
 * @description The onLaunch callback is invoked after the application JavaScript
 * has been parsed into a JavaScript context. The handler is passed an object
 * that contains options passed in for launch. These options are defined in the
 * swift or objective-c client code. Options can be used to communicate to
 * your JavaScript code that data and as well as state information, like if the
 * the app is being launched in the background.
 *
 * The location attribute is automatically added to the object and represents
 * the URL that was used to retrieve the application JavaScript.
 */
App.onLaunch = function (options) {
    console.log("Started application");
    baseURL = options.BASEURL;

    var jsonUrl = baseURL + "data/apple-tv-screensavers.json";

    var loadingDocument = createLoadingDocument();
    navigationDocument.pushDocument(loadingDocument);

    loadJson(jsonUrl, onLoadMainJson, loadingDocument);
};


App.onWillResignActive = function () {

};

App.onDidEnterBackground = function () {

};

App.onWillEnterForeground = function () {

};

App.onDidBecomeActive = function () {

};

App.onWillTerminate = function () {

};

function loadJson(jsonUrl, callback, activeDocument) {
    const request = new XMLHttpRequest();

    request.open("GET", jsonUrl, true);

    request.onreadystatechange = function () {
        if (request.readyState !== 4) {
            console.log(`request.readyState: ${request.readyState}`);
            return;
        }

        if (request.status === 200) {
            callback(request, activeDocument);
        }
    };

    request.send();
}

function onLoadMainJson(request, activeDocument) {
    const data = JSON.parse(request.responseText);

    App.videosByLabel = {};

    const labels = new Set();

    for (let i = 0; i < data.length; i++) {
        if ("assets" in data[i]) {
            let assets = data[i]["assets"];

            for (let j = 0; j < assets.length; j++) {
                let videoId = assets[j].id;
                let url = assets[j].url;
                let label = assets[j].accessibilityLabel;
                let timeOfDay = assets[j].timeOfDay;

                labels.add(label);

                if (!(label in App.videosByLabel)) {
                    App.videosByLabel[label] = {};
                }

                App.videosByLabel[label][videoId] = {
                    url: url,
                    timeOfDay: timeOfDay
                }
            }
        } else {
            console.log(`No assets in data at slot ${i}`);
        }
    }

    let items = [];

    for (let label of labels) {
        let itemTpl = `
            <menuItem selectTargetLabel="${label}">
                <title>${label}</title>
            </menuItem>`;
        items.push(itemTpl);
    }

    let menuBarTpl = `
        <document>
            <menuBarTemplate>
                <menuBar>
                    ${items.join("\n")}
                </menuBar>
            </menuBarTemplate>
        </document>`;

    console.log(`menuBar: ${menuBarTpl}`);
    let document = new DOMParser().parseFromString(menuBarTpl, "application/xml");

    document.addEventListener("select", handleSelectEvent);

    if (typeof activeDocument !== "undefined") {
        navigationDocument.replaceDocument(document, activeDocument);
        console.log("Done with replaceDocument");
    } else {
        navigationDocument.pushDocument(document);
        console.log("Done with pushDocument");
    }
}

function loadAndPushDocument(url) {
    const loadingDocument = createLoadingDocument();
    navigationDocument.pushDocument(loadingDocument);

    const request = new XMLHttpRequest();
    request.open("GET", url, true);

    request.onreadystatechange = function () {
        if (request.readyState !== 4) {
            console.log(`request.readyState: ${request.readyState}`);
            return;
        }

        if (request.status === 200) {
            const document = request.responseXML;
            document.addEventListener("select", handleSelectEvent);
            navigationDocument.replaceDocument(document, loadingDocument)
        } else {
            const alertDocument = createAlertDocument("Error", `Error loading document ${url}`);

            navigationDocument.popDocument();
            navigationDocument.presentModal(alertDocument);
        }
    };

    request.send();
}

function updateMenuItem(menuItem, label) {
    let movies = "";

    const menuItemDocument = menuItem.parentNode.getFeature("MenuBarDocument");
    const loadingDocument = createLoadingDocument(`Loading ${label}...`);
    menuItemDocument.setDocument(loadingDocument, menuItem);

    const vidsForLabel = App.videosByLabel[label];

    for (let key in vidsForLabel) {
        if (vidsForLabel.hasOwnProperty(key)) {
            let vid = vidsForLabel[key];
            // let thumb = `https://loremflickr.com/1280/720?random=${key}`;
            let thumb = getThumbnail(key, vid.url);
            console.log(`thumb: ${thumb}`);
            movies += `
                <lockup targetUrl="${vid.url}">
                    <img src="${thumb}" width="1280" height="720" />
                    <title>${label} - ${vid.timeOfDay}</title>
                </lockup>
            `;
        }
    }

    const template = `
        <document>
            <showcaseTemplate>
                <banner>
                    <title>${label} Screensavers</title>
                </banner>
                <carousel>
                    <section>
                        ${movies}
                    </section>
                </carousel>
            </showcaseTemplate>
        </document>`;
    console.log(`template: ${template}`);

    let parsedTemplate = new DOMParser().parseFromString(template, "application/xml");
    parsedTemplate.addEventListener("select", handleSelectVideo);

    menuItemDocument.setDocument(parsedTemplate, menuItem);

    console.log(`Set menu item document to ${label}`);
}

function handleSelectVideo(event) {
    const selectedElement = event.target;

    console.log(selectedElement);
    let targetUrl = selectedElement.getAttribute("targetUrl");
    console.log(targetUrl);

    const singleVideo = new MediaItem('video', targetUrl);
    const videoList = new Playlist();
    videoList.push(singleVideo);
    const myPlayer = new Player();
    myPlayer.playlist = videoList;
    myPlayer.play();
}

function handleSelectEvent(event) {
    const selectedElement = event.target;

    let targetLabel = selectedElement.getAttribute("selectTargetLabel");
    console.log(`Selected ${targetLabel}`);
    if (!targetLabel) {
        return;
    }
    if (selectedElement.tagName === "menuItem") {
        updateMenuItem(selectedElement, targetLabel);
    }
    else {
        console.log(`Got unexpected tagname: ${selectedElement.tagName}`);
    }
}

/**
 * Convenience function to create a TVML loading document with a specified title.
 */
function createLoadingDocument(title) {
    // If no title has been specified, fall back to "Loading...".
    title = title || "Loading...";

    const template = `<?xml version="1.0" encoding="UTF-8" ?>
        <document>
            <loadingTemplate>
                <activityIndicator>
                    <title>${title}</title>
                </activityIndicator>
            </loadingTemplate>
        </document>`;

    return new DOMParser().parseFromString(template, "application/xml");
}

/**
 * Convenience function to create a TVML alert document with a title and description.
 */
function createAlertDocument(title, description) {
    const template = `<?xml version="1.0" encoding="UTF-8" ?>
        <document>
            <alertTemplate>
                <title>${title}</title>
                <description>${description}</description>
            </alertTemplate>
        </document>`;

    return new DOMParser().parseFromString(template, "application/xml");
}

/**
 * Convenience function to create a TVML alert document with a title and description.
 */
function createDescriptiveAlertDocument(title, description) {
    const template = `<?xml version="1.0" encoding="UTF-8" ?>
        <document>
            <descriptiveAlertTemplate>
                <title>${title}</title>
                <description>${description}</description>
            </descriptiveAlertTemplate>
        </document>`;

    return new DOMParser().parseFromString(template, "application/xml");
}

/**
 * Convenience function to create a TVML alert for failed evaluateScripts.
 */
function createEvalErrorAlertDocument() {
    const title = "Evaluate Scripts Error";
    const description = [
        "There was an error attempting to evaluate the external JavaScript files.",
        "Please check your network connection and try again later."
    ].join("\n\n");

    return createAlertDocument(title, description);
}

/**
 * Convenience function to create a TVML alert for a failed XMLHttpRequest.
 */
function createLoadErrorAlertDocument(url, xhr) {
    const title = (xhr.status) ? `Fetch Error ${xhr.status}` : "Fetch Error";
    const description = `Could not load document:\n${url}\n(${xhr.statusText})`;
    return createAlertDocument(title, description);
}

