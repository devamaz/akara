( () => {

    "use strict";

    const mime = require("mime");

    const url = require("url");

    const {
        video
    } = require("../js/video_control.js");

    const {
        addMediaCb
    } = require("../js/dropdown_callbacks.js");

    const {
        readSubtitleFile,
        uploadYoutubeVideo
    } = require("../js/util.js");

    const akara_emit = require("../js/emitter.js");

    const {
        ipcRenderer: ipc,
        remote: {
            BrowserWindow,
            dialog,
            require: _require
        }
    } = require("electron");

    const { requireSettingsPath } = _require("./constants.js");

    const {
        addMediaFile,
        addMediaFolder,
        search,
        _play,
        _stop,
        _pause,
        _next,
        _previous,
        _setPlaybackRate,
        _enterfullscreen,
        _leavefullscreen,
        showMediaInfoWindow,
        loadplaylist
    } = require("../js/handle_dropdown_commands.js")();

    const {
        fireControlButtonEvent,
        videoLoadData,
        setFullScreen,
        mouseNotHoverVideo,
        mouseMoveOnVideo,
        updateTimeIndicator,
        videoPauseEvent,
        videoPlayEvent,
        videoLoadedEvent,
        setTime,
        videoErrorEvent,
        contextMenuEvent,
        clickedMoveToEvent,
        mouseMoveShowCurrentTimeEvent,
        removeHoverTime,
        mouseDownDragEvent,
        moveToDragedPos,
        handleVolumeChange,
        handleVolumeWheelChange,
        lowHighVolume,
        subHandler,
        showSubtitle,
        showFileLocation,
        loadContextPlaylist,
        contextPlaylist,
        removeContextPlaylist,
        controlDragFullScreen,
        controlMouseEnter,
        controlMouseLeave,
        videoEndedEvent,
        videoSetFilter,
        videoResetFilter,
        mediaProgress,
        mediaWating,
        handleLoadSubtitle
    } = require("../js/videohandlers.js");

    const {
        createNewWindow: playListWindow
    } = _require("./newwindow.js");

    const fs = require("fs");

    const currTimeUpdate = document.querySelector(".akara-update-cur-time"),
        jumpToSeekElement = document.querySelector(".akara-time"),
        akaraVolume = document.querySelector(".akara-volume"),
        akaraControl = document.querySelector(".akara-control"),
        controlElements = akaraControl.querySelector(".akara-control-element");



    controlElements.addEventListener("click", fireControlButtonEvent);

    video.addEventListener("loadeddata",videoLoadData);
    video.addEventListener("dblclick", setFullScreen);
    video.addEventListener("mousemove", mouseMoveOnVideo);
    video.addEventListener("timeupdate", updateTimeIndicator);
    video.addEventListener("ended", videoEndedEvent);
    video.addEventListener("pause", videoPauseEvent );
    video.addEventListener("play", videoPlayEvent );
    video.addEventListener("loadstart", videoLoadedEvent);
    video.addEventListener("loadedmetadata", () => {
        currTimeUpdate.textContent = setTime();
    });

    video.addEventListener("error", videoErrorEvent);
    video.addEventListener("contextmenu", contextMenuEvent);
    video.addEventListener("progress", mediaProgress);
    video.addEventListener("seeking", mediaProgress);

    video.addEventListener("volumechange", evt => {

        const volumeSettingPath = requireSettingsPath("volume.json");
        const volumeSettings = require(volumeSettingPath);

        if ( volumeSettings.volume_warn_exceed_max && volumeSettings.volume_default_level > volumeSettings.volume_max_level ) {

            if ( Boolean(localStorage.getItem("DONT_SHOW_VOLUME_WARNING")) === true )
                return ;

            dialog.showMessageBox({
                type: "warning",
                title: "Too Much Volume",
                message: `video volume exceeds ${volumeSettings.volume_max_level}%`,
                buttons: [ "Cancel" ]
            });

            localStorage.setItem("DONT_SHOW_VOLUME_WARNING", true);
        }
    });

    video.addEventListener("waiting", mediaWating);

    jumpToSeekElement.addEventListener("click", clickedMoveToEvent);
    jumpToSeekElement.addEventListener("mousemove", mouseMoveShowCurrentTimeEvent);
    jumpToSeekElement.addEventListener("mouseout", removeHoverTime);
    jumpToSeekElement.addEventListener("mousedown", mouseDownDragEvent);
    jumpToSeekElement.addEventListener("mouseup", () => {
        jumpToSeekElement.removeEventListener(
            "mousemove",
            moveToDragedPos
        );
    });

    akaraVolume.addEventListener("click", handleVolumeChange);
    akaraVolume.addEventListener("mousewheel", handleVolumeWheelChange);

    akara_emit.on("video::volume", lowHighVolume);

    ipc.on("video-open-file", addMediaFile);
    ipc.on("video-open-folder", addMediaFolder);
    ipc.on("video-play", _play);
    ipc.on("video-pause", _pause);
    ipc.on("video-stop", _stop);
    ipc.on("video-next", _next);
    ipc.on("video-previous", _previous);

    ipc.on("video-repeat", () =>  {
        video.loop = true;
        localStorage.setItem("LOOP_CURRENT_VIDEO", video.getAttribute("data-id"));
    });

    ipc.on("video-no-repeat", () => {
        video.loop = false;
        localStorage.removeItem("LOOP_CURRENT_VIDEO");
    });

    ipc.on("video-open-external", showFileLocation);

    ipc.on("normal-speed", () => _setPlaybackRate(1));

    Promise.resolve(requireSettingsPath("playbackrate.json")).
        then( playbackFile => {
            const { fast,veryfast,slow,veryslow } = require(playbackFile);
            ipc.on("fast-speed", () => _setPlaybackRate(fast));
            ipc.on("very-fast-speed", () => _setPlaybackRate(veryfast));
            ipc.on("slow-speed", () => _setPlaybackRate(slow));
            ipc.on("very-slow-speed", () => _setPlaybackRate(veryslow));
        });

    ipc.on("subtitle::load-sub", subHandler );
    ipc.on("enter-video-fullscreen", _enterfullscreen);
    ipc.on("leave-video-fullscreen", _leavefullscreen);
    ipc.on("video-search", search);

    ipc.on("media-info", showMediaInfoWindow);

    ipc.on("akara::video::currentplaying", (evt,winid,fromPlist) => {

        if ( fromPlist ) {
            ipc.sendTo(winid, "akara::video::currentplaying:src", localStorage.getItem("akara::mediainfo:playlist_section"));
            localStorage.removeItem("akara::mediainfo:playlist_section");
            return ;
        }

        ipc.sendTo(winid, "akara::video::currentplaying:src", video.src);
    });

    ipc.on("akara::podcast:play", (evt,podmetadata,category) => {
        const { episode: { enclosure: { url } } } = JSON.parse(podmetadata);
        localStorage.setItem("podcast-metadata", podmetadata);
        addMediaCb(decodeURIComponent(url),category);
    });

    ipc.on("akara::video:filter", videoSetFilter);
    ipc.on("akara::video:filter:reset", videoResetFilter);
    ipc.on("akara::video:filter:reset:all",  () => {
        video.style.filter = "unset";
        akara_emit.emit("akara::processStatus", `video filter unset`, true);
    });
    ipc.on("akara::playlist:import", loadplaylist);
    ipc.on("akara::video:poster:change", (evt,poster) => {
        video.poster = poster;
    });

    ipc.on("akara::youtube:loggedin:share", (evt,youtubeClient) => {
        const request = require("request");
        youtubeClient.request = request;
        uploadYoutubeVideo(youtubeClient);
    });

    ipc.on("akara::send:media:file", (evt,id) => {
        evt.sender.sendTo(id,"akara::media:file", video.getAttribute("src"));
    });

    ipc.on("akara::subtitle:style:change", (evt,cssProps,cssValue) => {
        const tracks = document.querySelectorAll("track");

        if ( tracks.length === 0 )
            return;

        const { webContents } = BrowserWindow.fromId(1);

        webContents.insertCSS(`
          ::cue {
            ${cssProps}: ${cssValue};
          }
       `);
    });


    akaraControl.addEventListener("mousedown", controlDragFullScreen);
    akaraControl.addEventListener("mouseenter", controlMouseEnter);
    akaraControl.addEventListener("mouseleave", controlMouseLeave);

    akara_emit.on("video::show_subtitle", showSubtitle);

    akara_emit.on("akara::playlist", videoContextMenu => {

        const {
            playlist: {
                file: playlistLocation
            }
        } = _require("./configuration.js");

        let submenu ;

        if ( ( submenu = contextPlaylist(videoContextMenu) ) ) {
            Object.assign(videoContextMenu[27], {
                submenu
            });
            return ;
        }

        if ( ( submenu  = loadContextPlaylist(videoContextMenu,playlistLocation) ) ) {
            Object.assign(videoContextMenu[28], {
                submenu
            });
            return ;
        }
    });

})();
