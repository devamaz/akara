; ( () => {

    const {
        loadpodcast,
        savepodcast
    } = require("../js/util.js");
    
    const {
        remote: {
            dialog,
            getCurrentWindow
        }
    } = require("electron");


    const podson = require("podson");
    const path = require("path");
    const url = require("url");
    const http = require("http");
    const podcastKey = new(require("../js/keyevents.js"));
    const podcastFuncs = document.querySelector(".podcast-fnality");
    const close = document.querySelector(".podcast-close");

    const appendPodcastToDOM = ({ episodes }) => {
        
        const podcastParent = document.querySelector(".podcast-right");    
        let ul = podcastParent.querySelector("ul");

        if ( ul )
            ul.remove();
        
        ul = document.createElement("ul");
        
        for ( let episode of episodes ) {
            const li = document.createElement("li");
            li.setAttribute("class", "podcast-audio");
            li.setAttribute("podcast-duration", episode.duration);
            li.setAttribute("podcast-title", episode.title);
            li.setAttribute("podcast-filesize", episode.enclosure.filesize);
            li.setAttribute("podcast-url", episode.enclosure.url);
            li.textContent = episode.title;
            ul.appendChild(li);
        }
        podcastParent.appendChild(ul);
    };

    const getPodcast = async (evt) => {

        let podLink = evt.target.getAttribute("data-url");
        
        if ( ! url.parse(podLink).protocol )
            podLink = podLink.replace(/^/,"http://");

        let result;

        try {
            result = await podson.getPodcast(podLink);
        } catch (ex) {
            result = ex;
        }

        if ( Error[Symbol.hasInstance](result) )
            return dialog.showErrorBox(
                "Bad Internet Connection",
                "Check your Internet connectivity"
            );

        console.log(result);
        return appendPodcastToDOM(result);
    };


    const createPodcast = podcasts => {
        
        let ul = document.querySelector(".podcastload ul") || document.createElement("ul");
        let podload = document.querySelector(".podcastload");
        let nopod = document.querySelector(".nopoadcast");

        if ( nopod )
            nopod.remove();

        podcasts.forEach( podLink => {
            let { name: podcaster } = path.parse(podLink);
            let li = document.createElement("li");
            li.setAttribute("data-url", podLink);
            li.setAttribute("data-podcast", podcaster);
            li.textContent = podcaster;
            li.addEventListener("click",getPodcast);
            ul.appendChild(li);

        });
        podload.appendChild(ul);
    };

    window.addEventListener("DOMContentLoaded", evt => {

        const podcasts = loadpodcast();

        let podload = document.querySelector(".podcastload");

        // pods.length is 0
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
                info.textContent = `Use a comma ( , ) to separate multiple podcast feed
                                    for example free.feedburner.com/love,free.feedburner.com/hate
                                   `;


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
            value: () => {}
        }
    });


    podcastFuncs.addEventListener("click", evt => {

        const target = evt.target;

        if ( target.nodeName.toLowerCase() !== "li" )
            return ;

        const method = target.getAttribute("class");

        try {
            podcast[method]();
        } catch(ex) {
            console.log("%s not implemented yet", method);
        };

    });

    close.addEventListener("click", () => getCurrentWindow().close());

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
