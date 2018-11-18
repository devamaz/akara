; ( () => {

    const {
        loadpodcast,
        savepodcast,
        removepodcast,
        handleWindowButtons,
        downloadWindow,
        downloadFile
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

    const min = document.querySelector("[data-winop=minimize]");
    const max = document.querySelector("[data-winop=maximize]");
    const close = document.querySelector("[data-winop=close]");




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

                const addpodcastArea = this.addpodcastArea = document.createElement("input");
                const podcastBtns = this.podcastBtns = document.createElement("div");

                const addpodcastAdd = this.addpodcastAdd  = document.createElement("button");
                const addpodcastCancel = this.addpodcastCancel = document.createElement("button");

                const coverView = this.coverView = document.createElement("div");

                podcastModal.setAttribute("class", "podcast-modal");
                podcastMParent.setAttribute("class", "podcast-modal-parent");

                info.setAttribute("class", "podcast-modal-info");

                addpodcastArea.setAttribute("class", "podcast-modal-addpodcastarea");
                addpodcastArea.setAttribute("data-prevent-shortcut", "true");

                podcastBtns.setAttribute("class", "podcast-modal-btn");

                addpodcastAdd.setAttribute("class", "podcast-modal-add");
                addpodcastCancel.setAttribute("class", "podcast-modal-cancel");


                coverView.setAttribute("class", "cover-view");
                addpodcastArea.type = "text";
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

                // if ( value.length === 0 ) {
                //     console.error("shit ass adding");
                //     return ;
                // }

                let podcasts = value.split(",");
                let modalDiv = document.querySelector(".podcast-modal");
                let spinDiv = document.createElement("div");
                let spin = document.createElement("spin");
                let logMessage = document.createElement("p");

                spinDiv.setAttribute("class", "podcast-spin-saving");
                logMessage.setAttribute("class", "podcast-spin-log");

                spinDiv.appendChild(spin);
                spinDiv.appendChild(logMessage);


                // apply ui button fonts here
                spin.setAttribute("class", "fa fa-spinner fa-pulse fa-5x podcast-spinning-save");

                modalDiv.appendChild(spinDiv);

                const removeSpinner = ({isDone}) => {
                    if ( ! isDone )
                        return ;
                    setTimeout( () => {
                        spinDiv.remove();
                        spinDiv = null;
                    },5000);
                };

                const _savepodcast = savepodcast(podcasts, (err,succ,obj) => {

                    if ( ! err && ! succ ) {
                        logMessage.textContent = `processing ${obj.name} ${obj.link}`;
                        removeSpinner(obj);
                        return;
                    }

                    if ( err ) {
                        if ( err.code === "PODCAST_NO_LOAD" ) {
                            logMessage.textContent = `cannot load ${err.podcastLink}`;
                            removeSpinner(err);
                            return ;
                        }
                        logMessage.textContent = err;
                        return ;
                    }

                    appendChannelToDom(succ);
                    spinDiv.remove();
                    this.__removeModal();
                    return ;
                });


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

        __currentSection: {
            value() {

                let podWidg = document.querySelector(".podcastload-main");

                if ( podWidg.style.display === "none" ) {
                    podWidg = document.querySelector(".podcaster-podcast");
                }

                return podWidg;
            }
        },

        podcastadd: {

            value() {
                this.__addpodcastModal();
            }
        },
        podcastremove: {
            value() {

                const podWidg = this.__currentSection().querySelectorAll("> li");

                Array.from(podWidg, channel => {

                    const checked = channel.querySelector(".fa-check-circle");

                    if ( ! checked )
                        return ;

                    removepodcast(channel.getAttribute("data-podcast"));
                    channel.remove();
                });
            }
        },

        podcastcheck: {

            value() {

                const self = this;

                console.log(self);

                const checkMenus = [
                    {
                        label: "checkall",
                        click() {

                            let podWidg = self.__currentSection();

                            Array.from(podWidg.querySelectorAll(".fa-circle-o"))
                                .forEach( notchecked => {
                                    notchecked.classList.remove("fa-circle-o");
                                    notchecked.classList.add("fa-check-circle");
                                });
                        },
                        accelerator: "Alt+C"
                    } ,
                    {
                        label: "uncheckall",
                        click() {

                            let podWidg = self.__currentSection();

                            Array.from(podWidg.querySelectorAll(".fa-check-circle"))
                                .forEach( checked => {
                                    checked.classList.remove("fa-check-circle");
                                    checked.classList.add("fa-circle-o");
                                });

                        },
                        accelerator: "Alt+Shift+C"
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

                const { podcast: _podcastPodcast } = _require("./configuration.js");
                const pod = require(_podcastPodcast);

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

                if ( spin ) {
                    spin.remove();
                }

                if ( Error[Symbol.hasInstance](result) ) {

                    podcast.podcasthome();

                    return dialog.showErrorBox(
                        "Bad Internet Connection",
                        "Check your Internet connectivity"
                    );
                }

                if ( appendToDom ) {
                    return appendPodcastToDOM(result, pod);
                }

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
                removepodcast(channel.getAttribute("data-podcast"));
                channel.remove();
            }
        }
    });



    const podcastPlayEvent = ({target}) => {
        //const podcasturl = target.parentNode.parentNode.getAttribute("podcast-url");
        const podcastmetadata = target.parentNode.parentNode.getAttribute("podcast-metadata");
        ipc.sendTo(1, "akara::podcast:play",podcastmetadata, "podder");
    };

    const podcastDownloadEvent = ({target}) => {
        const podcastmetadata = target.parentNode.parentNode.getAttribute("podcast-metadata");
        const { episode: { enclosure: { url } } } = JSON.parse(podcastmetadata);
        const win = downloadWindow();
        downloadFile(url, win);
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
       append all the podcasters podcast to the DOM
     **/

    const appendPodcastToDOM = (result,podB) => {

        const podcastParent = document.querySelector(".podcastload-podcaster");
        const ul = podcastParent.querySelector(".podcaster-podcast") || document.createElement("ul");
        const { episodes, title } = result;
        const _savedpod = podB[title];

        ul.setAttribute("class", "podcaster-podcast");

        for ( let episode of episodes ) {
            const li = document.createElement("li");
            const span = document.createElement("span");
            const image = new Image();
            const { title: podTitle } = episode;

            delete episode.image;

            li.setAttribute("class", "podcast-audio");
            li.setAttribute("podcast-duration", episode.duration);
            li.setAttribute("podcast-title", episode.title);
            li.setAttribute("podcast-filesize", episode.enclosure.filesize);
            li.setAttribute("podcast-url", episode.enclosure.url);

            _savedpod.episode = episode;

            li.setAttribute("podcast-metadata", JSON.stringify(_savedpod));

            span.setAttribute("class", "podcast-title");

            span.textContent = podTitle.length > 48 ?
                podTitle.replace(
                    new RegExp(podTitle.substr(48 + 1, podTitle.length)), "..."
                )
                : podTitle;

            image.setAttribute("class", "podcast-image");

            image.src =_savedpod.image;

            li.appendChild(span);
            li.appendChild(image);
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

        spinner = document.createElement("div");
        spinner.setAttribute("class", "podcast-spinner");

        spin.setAttribute("class", "fa fa-spinner fa-pulse fa-5x");

        spinner.appendChild(spin);

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

    const appendChannelToDom = pod => {

        const podcastLoadMain = document.querySelector(".podcastload-main");

        const { description, image, title, owner, language, podlink, categories } = pod;

        // remove me after
        if ( ! title )
            return ;

        let li = document.createElement("li");
        let p = document.createElement("p");
        let podcastImage = new Image();

        podcastImage.src = image;
        podcastImage.setAttribute("class", "podcast-image");

        li.setAttribute("data-url", podlink);
        li.setAttribute("data-podcast", title);
        li.setAttribute("data-podcast-descr", description.long);
        li.setAttribute("data-podcast-categories", categories.join(" "));

        p.setAttribute("class", "podcaster-podcast-name");
        p.textContent = title;

        li.appendChild(p);
        li.appendChild(podcastImage);

        li.appendChild(podcastsChannelWidget());

        podcastLoadMain.appendChild(li);

    };


    const createPodcast = podcasts => {

        const nopod = document.querySelector(".nopoadcast");

        console.log(podcasts);

        if ( nopod )
            nopod.remove();

        Object.keys(podcasts).forEach( pod => appendChannelToDom(podcasts[pod]));
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
        let podload = document.querySelector(".podcastload-main");

        if ( ! Object.keys(podcasts).length ) {
            let nopod = document.createElement("p");
            nopod.classList.add("nopoadcast");
            nopod.innerHTML = "You don't have any podcast";
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


    handleWindowButtons({ close, min, max});

})();
