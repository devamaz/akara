; ( () => {

    const {
        loadpodcast,
        savepodcast,
        removepodcast,
        handleWindowButtons
    } = require("../js/util.js");

    const {
        ipcRenderer: ipc,
        remote: {
            dialog,
            getCurrentWindow,
            Menu,
            MenuItem,
            require: _require
        }
    } = require("electron");

    const {
        downloadI
    } = _require("./utils.js");

    const podson = require("podson");
    const path = require("path");
    const url = require("url");
    const http = require("http");

    const podcastKey = new(require("../js/keyevents.js"));
    const podcastFuncs = document.querySelector("section");

    const min = document.querySelector(".window-min");
    const max = document.querySelector(".window-max");
    const close = document.querySelector(".window-close");




    /**
       build widgets and also handle events related
       to each podcast created by a podcaster
    **/

    const podcast = Object.defineProperties( {} , {

        __addpodcastModal: {

            value() {

                const podcastModal = this.podcastModal = document.createElement("div");
                const podcastMParent = this.podcastMParent = document.createElement("div");

                const info = this.info = document.createElement("p");

                const addpodcastArea = this.addpodcastArea = document.createElement("textarea");
                const podcastBtns = this.podcastBtns = document.createElement("div");

                const addpodcastAdd = this.addpodcastAdd  = document.createElement("button");
                const addpodcastCancel = this.addpodcastCancel = document.createElement("button");

                const coverView = this.coverView = document.createElement("div");

                podcastModal.setAttribute("class", "podcast-modal");
                podcastMParent.setAttribute("class", "podcast-modal-parent");

                info.setAttribute("class", "podcast-modal-info");

                addpodcastArea.setAttribute("class", "podcast-modal-addpodcastarea");

                podcastBtns.setAttribute("class", "podcast-modal-btn");

                addpodcastAdd.setAttribute("class", "podcast-modal-add");
                addpodcastCancel.setAttribute("class", "podcast-modal-cancel");


                coverView.setAttribute("class", "cover-view");

                addpodcastAdd.textContent = "Add";
                addpodcastCancel.textContent = "Cancel";
                info.textContent = "input podcast url, separate each urls with comma";


                podcastBtns.appendChild(addpodcastAdd);
                podcastBtns.appendChild(addpodcastCancel);

                podcastMParent.appendChild(info);
                podcastMParent.appendChild(addpodcastArea);
                podcastMParent.appendChild(podcastBtns);


                podcastModal.appendChild(podcastMParent);

                document.body.appendChild(coverView);
                document.body.appendChild(podcastModal);

                this.__addpodcastAddEvent = this.__savePodcast.bind(this);
                this.__addpodcastCancelEvent = this.__cancelPodcast.bind(this);

                addpodcastAdd.addEventListener("click", this.__addpodcastAddEvent);
                addpodcastCancel.addEventListener("click", this.__addpodcastCancelEvent);

            },
            enumerable: false,
            configurable: false,
            writable: false
        },
        __savePodcast: {
            value() {

                const { value }  = this.addpodcastArea;

                if ( value.length === 0 )
                    return console.error("shit ass adding");

                let podcasts = value.split(",");

                if ( ! savepodcast(podcasts) )

                    return dialog.showMessageBox(
                        "Error while saving podccast feed",
                        "check your podcast list for improper input"
                    );

                createPodcast(podcasts);

                return this.__removeModal();
            }
        },
        __cancelPodcast: {
            value() {
                return this.__removeModal();
            }
        },
        __removeModal: {
            value() {
                this.addpodcastAdd.removeEventListener("click", this.__addpodcastAddEvent);
                this.addpodcastCancel.removeEventListener("click", this.__addpodcastCancelEvent);
                this.coverView.remove();
                return this.podcastModal.remove();
            }
        },
        podcastadd: {

            value() {
                this.__addpodcastModal();
            }
        },
        podcastremove: {
            value: () => {
                const podWidg = document.querySelectorAll(".podcastload-main > li");

                Array.from(podWidg, channel => {

                    const checked = channel.querySelector(".fa-check-circle");

                    if ( ! checked )
                        return ;

                    removepodcast(channel.getAttribute("data-url"));
                    channel.remove();
                });
            }
        },
        podcastcheck: {
            value: () => {
                const checkMenus = [
                    {
                        label: "checkall",
                        click() {
                            const podWidg = document.querySelector(".podcastload-main");
                            Array.from(podWidg.querySelectorAll(".fa-circle-o"))
                                .forEach( notchecked => {
                                    notchecked.classList.remove("fa-circle-o");
                                    notchecked.classList.add("fa-check-circle");
                                });
                        },
                        accelerator: ""
                    } ,
                    {
                        label: "uncheckall",
                        click() {
                            const podWidg = document.querySelector(".podcastload-main");
                            Array.from(podWidg.querySelectorAll(".fa-check-circle"))
                                .forEach( checked => {
                                    checked.classList.remove("fa-check-circle");
                                    checked.classList.add("fa-circle-o");
                                });
                        },
                        accelerator: ""
                    }
                ];

                const menu = new Menu();

                menu.clear();

                checkMenus.forEach( _menu => {
                    menu.append(new MenuItem(_menu));
                });

                menu.popup({async: true});
            }
        },
        podcasthome: {
            value() {

                const podcastMain = document.querySelector(".podcastload-main");
                const podcastPodcaster = document.querySelector(".podcastload-podcaster");

                podcastPodcaster.style.display = null;
                podcastMain.style.display = null;
            }
        },

        __views: {
            value(type) {
                const podcastSection = document.querySelector("section");
                const podcastMain = document.querySelector(".podcastload-main");


                if( podcastSection.getAttribute("data-view") === type )
                    return ;

                podcastSection.setAttribute("data-view", type);

                if ( podcastMain.hasAttribute("data-view-anim") )
                    podcastMain.removeAttribute("data-view-anim");


                podcastMain.style.opacity = 0;

                setTimeout( () => {
                    podcastMain.setAttribute("data-view-anim", "animation");
                },50);
            }
        },
        podcastgrid: {

            value() {
                this.__views("grid");
            }
        },
        podcastlist: {
            value() {
                this.__views("list");
            }
        }
    });


    /**
       widgets that handles operation on the podcaster channel
     **/

    const podcastNameWidgetHandler = Object.defineProperties( {} , {
        folder: {
            async value(evt,appendToDom = true) {

                let podLink = evt.target.parentNode.parentNode.getAttribute("data-url");
                let result;

                if ( ! url.parse(podLink).protocol )
                    podLink = podLink.replace(/^/,"http://");

                let spin = appendToDom ? spinOnPodLoad() : false;

                try {
                    result = await podson.getPodcast(podLink);
                } catch (ex) {
                    result = ex;
                }

                if ( spin )
                    spin.remove();

                if ( Error[Symbol.hasInstance](result) ) {

                    podcast.podcasthome();

                    return dialog.showErrorBox(
                        "Bad Internet Connection",
                        "Check your Internet connectivity"
                    );
                }

                if ( appendToDom )
                    return appendPodcastToDOM(result);

                return result;
            }
        },
        play: {
            async value(evt) {
                const allpodcasts = await this.folder(evt, false);
                ipc.sendTo(1,"akara::podcast:play", allpodcasts, "podder");
            }
        },
        download: {
            value(evt) {
            }
        },
        "circle-o": {
            value(evt) {
                const target = evt.target;
                target.classList.toggle("fa-check-circle");
                target.classList.toggle("fa-circle-o");
            }
        },
        "times-circle": {
            value(evt) {
                const channel = evt.target.parentNode.parentNode;
                removepodcast(channel.getAttribute("data-url"));
                channel.remove();
            }
        }
    });



    const podcastPlayEvent = ({target}) => {
        const podcasturl = target.parentNode.parentNode.getAttribute("podcast-url");
        ipc.sendTo(1, "akara::podcast:play", [ podcasturl ], "podder");
    };

    const podcastDownloadEvent = () => {

    };


    const podcastRemoveEvent = evt =>
          evt.parentNode.parentNode.remove();


    /**
       widgets located at the podcast channel podcasts
     **/
    const podAudioWidget = () => {

        let widgetP = document.createElement("div");

        let playI = document.createElement("i"),
            downloadI = document.createElement("i"),
            removePodI = document.createElement("i");

        playI.setAttribute("class", "fa fa-play-circle");
        downloadI.setAttribute("class", "fa fa-download");
        removePodI.setAttribute("class", "fa fa-times-circle");

        playI.addEventListener("click", podcastPlayEvent);
        downloadI.addEventListener("click", podcastDownloadEvent);
        removePodI.addEventListener("click", podcastRemoveEvent);

        [ playI, downloadI, removePodI ].
            forEach( wid => widgetP.appendChild(wid));

        widgetP.setAttribute("class", "podaudio-widget");

        return widgetP;
    };



    /**
       append all the podcasters podcast to the DOMA
     **/

    const appendPodcastToDOM = ({ episodes }) => {

        const podcastParent = document.querySelector(".podcastload-podcaster");
        const ul = podcastParent.querySelector(".podcaster-podcast") || document.createElement("ul");

        ul.setAttribute("class", "podcaster-podcast");

        for ( let episode of episodes ) {
            const li = document.createElement("li");
            const { title: podTitle } = episode;

            li.setAttribute("class", "podcast-audio");
            li.setAttribute("podcast-duration", episode.duration);
            li.setAttribute("podcast-title", episode.title);
            li.setAttribute("podcast-filesize", episode.enclosure.filesize);
            li.setAttribute("podcast-url", episode.enclosure.url);

            li.textContent = podTitle.length > 48 ?
                podTitle.replace(
                    new RegExp(podTitle.substr(48 + 1, podTitle.length)), "..."
                )
                : podTitle;

            li.appendChild(podAudioWidget());

            ul.appendChild(li);
        }
        podcastParent.appendChild(ul);
    };



    /**
       fire up this spinner when searching the internet
       for podcasters podcast
    **/

    const spinOnPodLoad = () => {

        let podcasterSection = document.querySelector(".podcastload-podcaster");

        let spinner = document.querySelector(".podcast-spinner");
        let podcasterPod = document.querySelector(".podcaster-podcast");
        let podcastLoadMain = document.querySelector(".podcastload-main");


        if ( spinner )
            spinner.remove();

        if ( podcasterPod )
            podcasterPod.remove();


        podcasterSection.style.display = "block";
        podcastLoadMain.style.display = "none";

        let spin = document.createElement("i");
        let loadText = document.createElement("p");

        spinner = document.createElement("div");
        spinner.setAttribute("class", "podcast-spinner");

        spin.setAttribute("class", "fa fa-spinner fa-pulse fa-5x");
        loadText.textContent = "Loading...";

        spinner.appendChild(spin);
        spinner.appendChild(loadText);

        podcasterSection.appendChild(spinner);

        return spinner;
    };



    /**
       build the podcasters channel widget,
       handlers for this widget are bound to podcastNameWidgetHandler Object
     **/

    const podcastsChannelWidget = () => {
        const pwidget = document.createElement("ul");
        // folder === open
        const channelWidgets = [ "folder" ,  "play" , "download", "circle-o", "times-circle" ];


        pwidget.setAttribute("class", "podcast-name-widgets");


        channelWidgets.forEach( widget => {
            const widg = document.createElement("li");
            widg.classList.add("fa");
            widg.classList.add(`fa-${widget}`);
            widg.addEventListener("click",podcastNameWidgetHandler[widget].bind(podcastNameWidgetHandler));
            pwidget.appendChild(widg);
        });
        return pwidget;
    };




    /**
       build all saved podcast channel
     **/

    const createPodcast = podcasts => {

        const podcastLoadMain = document.querySelector(".podcastload-main");
        const nopod = document.querySelector(".nopoadcast");


        if ( nopod )
            nopod.remove();

        podcasts.forEach( podLink => {

            let { name: podcaster } = path.parse(podLink);
            let li = document.createElement("li");
            let p = document.createElement("p");

            li.setAttribute("data-url", podLink);
            li.setAttribute("data-podcast", podcaster);

            p.setAttribute("class", "podcaster-podcast-name");
            p.textContent = podcaster[0].toUpperCase() + podcaster.substr(1,podcaster.length);

            li.appendChild(p);

            li.appendChild(podcastsChannelWidget());

            podcastLoadMain.appendChild(li);

        });
    };

    podcastFuncs.addEventListener("click", evt => {

        const target = evt.target;

        if ( ! target.classList.contains("podcast-icon-operation") )
            return ;

        const method = target.parentNode.getAttribute("class");

        try {
            podcast[method]();
        } catch(ex) {
            console.log(ex);
            console.log("%s not implemented yet", method);
        };

    });


    close.addEventListener("click", () => getCurrentWindow().close());

    window.addEventListener("DOMContentLoaded", evt => {

        const podcasts = loadpodcast();

        let podload = document.querySelector(".podcastload");

        if ( ! podcasts.length ) {
            let nopod = document.createElement("p");
            nopod.classList.add("nopoadcast");
            nopod.innerHTML = "No podcast has been added yet";
            podload.appendChild(nopod);
            return ;
        }
        createPodcast(podcasts);
        return ;
    });

    podcastKey.register({
        key: "Escape",
        handler() {
            const modal = document.querySelector(".podcast-modal");

            if ( modal )
                podcast.__removeModal();

        }
    });

    podcastKey.register({
        key: "Enter",
        modifier: [ "ctrlKey" ],
        handler() {

            const modal = document.querySelector(".podcast-modal");

            if ( modal )
                podcast.__savePodcast();
        }
    });

})();
