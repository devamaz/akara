; ( () => {

    "use strict";

    const {
        remote: {
            app,
            dialog,
            require: _require
        }
    } = require("electron");

    const fs = require("fs");

    const { handleWindowButtons } = require("../../js/util.js");
    const { requireSettingsPath } = _require("./constants.js");

    const shortcutMin = document.querySelector("[data-winop=minimize]");
    const shortcutMax = document.querySelector("[data-winop=maximize]");
    const shortcutClose = document.querySelector("[data-winop=close]");
    const showSettings = document.querySelector(".shortcut_show_settings");
    const shortcutList = document.querySelector(".shortcutkey_list");


    const saveShortcut = async ({ key, modifier, shortcut, shortcutType }) => {

        const shortcutpath = await requireSettingsPath("shortcut.json");
        const shortcutsettings = require(shortcutpath);
        const shortcutKeySettings = shortcutsettings[shortcut];

        const shortcutObj = shortcutKeySettings.find( setting => setting[shortcutType] );

        Object.assign( shortcutObj , {
            [shortcutType]: {
                key,
                modifier
            }
        });

        fs.writeFileSync(shortcutpath, JSON.stringify(shortcutsettings));
    };

    const processShortcut = (key,modifier,keyValue) => {

        const pNode = keyValue.parentNode;

        modifier = modifier.length > 0 ? `${modifier.join("  +  ")}  +  ` : "  ";

        if ( ! pNode ) {
            keyValue.textContent = `${modifier}  ${key}`;
            return true;
        }

        if ( key === "" ) {
            pNode.setAttribute("data-modify-invalid", "invalid");
            keyValue.textContent = modifier;
            return null;
        }

        pNode.removeAttribute("data-modify-invalid");
        keyValue.textContent = `${modifier}  ${key}`;

        return { saveShortcut };

    };

    const appendSettingsToDom = async (type) => {

        const shortcutpath = await requireSettingsPath("shortcut.json");
        const shortcutsettings = require(shortcutpath);

        const shortcutKeySettings = shortcutsettings[type];

        const _ul = document.querySelector(".shortcut_key_list");

        const ul = _ul
              ? (() => {
                  _ul.remove();
                  return document.createElement("ul");
              })()
              : document.createElement("ul");

        ul.setAttribute("class", "shortcut_key_list");
        ul.setAttribute("data-shortcut", type);

        showSettings.appendChild(ul);

        for ( const shortcuttype of shortcutKeySettings ) {

            Object.keys(shortcuttype).forEach( kName => {

                const li = document.createElement("li");
                const keyName = document.createElement("span");
                const keyValue = document.createElement("span");

                const shortcutKey = shortcuttype[kName];
                console.log(shortcutKey);
                processShortcut(shortcutKey.key, shortcutKey.modifier, keyValue);

                keyName.textContent = kName;

                li.setAttribute("class", "shortcut_key_item");

                keyName.setAttribute("class", "shortcut_key_name");

                keyValue.setAttribute("class", "shortcut_key_value");
                keyValue.setAttribute("data-shortcut-type", kName);

                li.appendChild(keyName);
                li.appendChild(keyValue);

                ul.appendChild(li);
            });
        }

    };

    shortcutList.addEventListener("click", evt => {

        const { target } = evt;

        if ( ! HTMLLIElement[Symbol.hasInstance](target) )
            return ;

        let invalidModify = showSettings.querySelector("[data-modify-invalid=invalid]");

        if ( invalidModify ) {
            dialog.showErrorBox("Invalid Key", `Invalid Shortcut Key for ${invalidModify.querySelector(".shortcut_key_name").textContent}`);
            return ;
        }

        const dataShowSet = target.getAttribute("data-show-set");

        try {
            appendSettingsToDom(dataShowSet);
        } catch(ex) {
            console.log(ex);
            dialog.showErrorBox("Not Implemented", `no implementation for ${dataShowSet}`);
        }
    });

    showSettings.addEventListener("click", evt => {

        const { target } = evt;

        if ( ! HTMLLIElement[Symbol.hasInstance](target) )
            return ;

        let invalidModify = showSettings.querySelector("[data-modify-invalid=invalid]");

        if ( invalidModify ) {
            dialog.showErrorBox("Invalid Key", `Invalid Shortcut Key for ${invalidModify.querySelector(".shortcut_key_name").textContent}`);
            return ;
        }

        if ( target.hasAttribute("data-modify-shortcut") ) {
            target.removeAttribute("data-modify-shortcut");
            return ;
        }

        let curModify = showSettings.querySelector("[data-modify-shortcut=modify]");

        if ( curModify )
            curModify.removeAttribute("data-modify-shortcut");

        target.setAttribute("data-modify-shortcut", "modify");

    });

    window.addEventListener("keydown", evt => {

        const modifyActive = showSettings.querySelector("[data-modify-shortcut=modify]");

        if ( ! modifyActive )
            return ;

        const shortcutTypeEl = modifyActive.parentNode;
        const keyValue = modifyActive.querySelector(".shortcut_key_value");

        let modifierKeys = [ "altKey", "ctrlKey", "metaKey", "shiftKey" ]
            .filter( mod => evt[mod] === true );

        let key_code = evt.code === "Space"
            ? evt.code
            : ( () => {
                if ( ! /Control|Alt|Shift/.test(evt.key) ) {
                    if ( ! /(ArrowRight|ArrowLeft|ArrowUp|ArrowDown|Tab)/.test(evt.key) )
                        return evt.key.toLowerCase();
                    return evt.key;
                }
                return "";
            })();

        const isValid = processShortcut(key_code, modifierKeys, keyValue);

        if ( ! isValid )
            return ;

        const shortcut = shortcutTypeEl.getAttribute("data-shortcut");
        const shortcutType = keyValue.getAttribute("data-shortcut-type");

        isValid.saveShortcut({
            key: key_code,
            modifier: modifierKeys,
            shortcut,
            shortcutType
        });

    });

    window.addEventListener("DOMContentLoaded", () => {
        appendSettingsToDom("video");
    });


    handleWindowButtons( { close: shortcutClose, min: shortcutMin, max: shortcutMax } );

})();