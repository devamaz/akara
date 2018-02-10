"use strict";

( (ul) => {

    const {
        ipcRenderer: ipc,
        remote: {
            Menu,
            MenuItem,
            getCurrentWindow,
            dialog,
            require: _require
        }
    } = require("electron");

    const {
        addMediaCb
    } = require("../js/dropdown_callbacks.js");

    const {
        removeTarget,
        removeType,
        setCurrentPlaying,
        removeClass,
        disableMenuItem,
        setupPlaying,
        prevNext,
        updatePlaylistName
    } = require("../js/util.js");

    const {
        createNewWindow: addPlaylistWindow
    } = _require("./newwindow.js");

    const {
        videoListMenu
    } = _require("./menu.js");

    const {
        iterateDir
    } = _require("./utils.js");

    const {
        controls,
        video
    } = require("../js/video_control.js");

    let {
        showMediaInfoWindow
    } = require("../js/handle_dropdown_commands.js")();

    const akara_emit = require("../js/emitter.js");
    const fs = require("fs");

    const {
        play,
        pause,
        stop,
        getCurrentTime,
        duration
    } = controls;

    let currentTarget;

    const menu = new Menu();

    window.addEventListener("DOMContentLoaded", event =>  {

        const coverOnError = document.querySelector(".cover-on-error-src");

        if ( video.getAttribute("src") )

            coverOnError.setAttribute("style", "display: none;");

    });


    ul.addEventListener("click", event => {

        let target = event.target;

        if ( target.nodeName.toLowerCase() === "ul" ) return ;

        target = target.nodeName.toLowerCase() === "li" ? target : target.parentNode;

        if ( ! target.hasAttribute("data-clicked") ) {

            removeType(target.parentNode,"data-clicked");

            updatePlaylistName(target);

            target.setAttribute("data-clicked","true");
        }
    });

    ul.addEventListener("dblclick", event => {

        let target = event.target;

        if ( target.nodeName.toLowerCase() === "ul" )
            return ;

        target = target.nodeName.toLowerCase() === "li" ? target : target.parentNode;

        if ( target.hasAttribute("data-converting") ) {
            dialog.showMessageBox({
                type: "info",
                title: "Can't play this media file",
                message: "This media file is currenlty undergoing conversion, and it can't be played",
                buttons: [ "Ok" ]
            });
            return ;
        }

        if ( ! target.hasAttribute("data-dbclicked") ) {
            setupPlaying(target);
            return ;
        }
    });


    ul.addEventListener("contextmenu", event => {

        let target = event.target;

        if ( target.nodeName.toLowerCase() === "ul" ) return ;

        // incase a span element which is the child of the li element is clicked
        target = target.nodeName.toLowerCase() === "li" ? target : target.parentNode;

        menu.clear();

        let menuInst;

        videoListMenu.forEach( contextMenu => {

            menuInst = new MenuItem(contextMenu);

            if ( /^Play$|^Pause$|Repeat/.test(menuInst.label) )
                disableMenuItem(menuInst,target,video);

            menu.append(menuInst);
        });
        menu.popup(getCurrentWindow(), { async: true });
        currentTarget = target;
    });

    ipc.on("media-droped-files", (event, mediaPaths) => {
        mediaPaths = decodeURIComponent(mediaPaths.replace("file://", ""));
        if ( fs.statSync(mediaPaths).isFile() ) {
            addMediaCb(mediaPaths);
            return ;
        }
        let files = [];
        iterateDir()(mediaPaths).forEach( fPath => files.push(fPath));
        addMediaCb(files);
        return ;
    });

    ipc.on("remove-target-hit", () => removeTarget(currentTarget,video));

    ipc.on("play-hit-target", () => {

        if ( ! currentTarget.hasAttribute("data-now-playing") )
            setupPlaying(currentTarget);

        if ( currentTarget.hasAttribute("data-now-playing") && video.paused )
            play();

    });

    ipc.on("pause-hit-target", (event) => {
        if ( currentTarget.hasAttribute("data-now-playing") )
            pause();
    });


    ipc.on("repeat-hit-target", () => {
        currentTarget.setAttribute("data-repeat", "true");
    });

    ipc.on("no-repeat-hit-target", () => {
        currentTarget.removeAttribute("data-repeat");
    });

    ipc.on("repeat-all", () => {
        currentTarget.parentNode.setAttribute("data-repeat", "true");
    });

    ipc.on("no-repeat-all", () => {
        currentTarget.parentNode.removeAttribute("data-repeat");
    });

    ipc.on("add-toplaylist-hit", () => {

        const obj = {
            width: 626,
            height: 400,
            title: "addplaylist",
            parent: getCurrentWindow()
        };

        localStorage.setItem("akara::addplaylist", currentTarget.getAttribute("data-full-path"));

        addPlaylistWindow(obj,"addplaylist.html");

    });

    ipc.on("akara::mediainfo", () => {
        localStorage.setItem("akara::mediainfo:playlist_section", currentTarget.getAttribute("data-full-path"));
        showMediaInfoWindow();
    });

    akara_emit.on("video::go-to-next", () => prevNext("next"));
    akara_emit.on("video::go-to-previous", () => prevNext("prev"));



})(document.querySelector(".akara-loaded"));
