/**
 *
 * Zimbra and Metadata.vn integration use webscript and Zimlet
 * Copyright (C) 2010  Businessmomentum

 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

/* Metadata.vn Integration zimlet object */
// Constants for web script services
var ALF_WS_URL_PREFIX = "/alfresco/service";
var ALF_WCWS_URL_PREFIX = "/alfresco/wcservice";
var ALF_LOGIN_SERVICE_URL = ALF_WS_URL_PREFIX + "/api/login";
var ALF_TICKET_SERVICE_URL = ALF_WS_URL_PREFIX + "/api/login/ticket/";

// Other constants used by this program
var METADATA_BUSYIMGURL = "img/animated/Imgwait_32.gif";

// Required as a global configuration instance for the NavTree loadNodeData function
var metadataAttachConfig = new Object();

// Message strings
var messageStrings = new Array();

function Org_Metadata_Zimbra() {
    this.ticket = decodeURIComponent(this.readCookie('alfresco_ticket'));
    this.alfurl = decodeURIComponent(this.readCookie('alfresco_url'));
    // this.alfurl = this.getAlfUrl();


    /* view state management (for attach files dialog) */
    this.viewstate_div = null; /* view state (document selection, pagination, etc) */

    /* (attachment state) variables */
    this.attach_current = -1; // current document being attached
    this.attach_documents = []; // list of documents to be attached
}

Org_Metadata_Zimbra.prototype = new ZmZimletBase();
Org_Metadata_Zimbra.prototype.constructor = Org_Metadata_Zimbra;


MetadataAttachView = function(attachDialog, parentTabView, zimlet) {
    var className = null;
    this._attachDialog = attachDialog;
    this._zimlet = zimlet;
    DwtTabViewPage.call(this, parentTabView, className, Dwt.STATIC_STYLE);
    this.setScrollStyle(Dwt.SCROLL);
};

MetadataAttachView.prototype = new DwtTabViewPage;
MetadataAttachView.prototype.constructor = MetadataAttachView;

// initializer function (automatically called by zimlet framework)
Org_Metadata_Zimbra.prototype.init = function() {

    // load message strings to a global array
    messageStrings["aboutMenu"] = this.getMessage("aboutMenu");
    messageStrings["aboutText"] = this.getMessage("aboutText");
    messageStrings["preferencesMenu"] = this.getMessage("preferencesMenu");
    messageStrings["preferencesServer"] = this.getMessage("preferencesServer");
    messageStrings["preferencesUserName"] = this.getMessage("preferencesUserName");
    messageStrings["preferencesPassword"] = this.getMessage("preferencesPassword");
    messageStrings["saveToMetadataMenu"] = this.getMessage("saveToMetadataMenu");
    messageStrings["saveToMetadataTitle"] = this.getMessage("saveToMetadataTitle");
    messageStrings["saveToMetadataDescription"] = this.getMessage("saveToMetadataDescription");
    messageStrings["saveToMetadataTags"] = this.getMessage("saveToMetadataTags");
    messageStrings["saveToMetadataSpace"] = this.getMessage("saveToMetadataSpace");
    messageStrings["saveToMetadataSpaceHint1"] = this.getMessage("saveToMetadataSpaceHint1");
    messageStrings["saveToMetadataSpaceHint2"] = this.getMessage("saveToMetadataSpaceHint2");
    messageStrings["saveToMetadataSave"] = this.getMessage("saveToMetadataSave");
    messageStrings["addAttachmentMetadataDocuments"] = this.getMessage("addAttachmentMetadataDocuments");
    messageStrings["addAttachmentAttach"] = this.getMessage("addAttachmentAttach");
    messageStrings["addAttachmentAttaching1"] = this.getMessage("addAttachmentAttaching1");
    messageStrings["addAttachmentAttaching2"] = this.getMessage("addAttachmentAttaching2");
    messageStrings["waitForAttaching"] = this.getMessage("waitForAttaching");
    messageStrings["waitForUploading"] = this.getMessage("waitForUploading");
    messageStrings["failedToConnectMetadata"] = this.getMessage("failedToConnectMetadata");
    messageStrings["uploadSuccess"] = this.getMessage("uploadSuccess");
    messageStrings["uploadFailed"] = this.getMessage("uploadFailed");
    messageStrings["message"] = this.getMessage("message");
    messageStrings["download"] = this.getMessage("download");
    messageStrings["pasteSortLink"] = this.getMessage("pasteSortLink");
    messageStrings["selectedDocuments"] = this.getMessage("selectedDocuments");
    messageStrings["selectedDocumentsName"] = this.getMessage("selectedDocumentsName");
    messageStrings["selectedDocumentsPath"] = this.getMessage("selectedDocumentsPath");
    messageStrings["selectedDocumentsActions"] = this.getMessage("selectedDocumentsActions");

    // add a property page to the `attach files' dialog
    this.addMetadataTabToAttachDialog();

    // add 'Save to Metadata.vn' link
    this.addAttachmentHandler();

    // assign self to window object because we need to execute some code in window context
    window.Metadata_widget = this;
};

// Cookie handler functions
Org_Metadata_Zimbra.prototype.createCookie = function(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
};

Org_Metadata_Zimbra.prototype.readCookie = function(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }

    return null;
};

Org_Metadata_Zimbra.prototype.eraseCookie = function(name) {
    createCookie(name,"",-1);
};

// Return the address URL of metadata server
Org_Metadata_Zimbra.prototype.getAlfUrl = function() {

    var url = decodeURIComponent(this.readCookie('alfresco_url'));
    if (this.alfurl !== undefined && this.alfurl !== null && this.alfurl !== "null") {
        return this.alfurl;

    } else if(url !== null && url !== '' && url !== "null") {
        this.alfurl = url;
        return this.alfurl;
    } else {

//        var alfurl = this.getUserProperty("alfurl"); 
	var alfurl = "https://metadata.vn:443";
        if (!alfurl) {
            alfurl = this._zimletContext.getConfig("alfurl");
        }
    
        this.alfurl = alfurl;
        return this.alfurl;
    }
}

/* Utility functions for debugging */
Org_Metadata_Zimbra.prototype.debug = function(msg) {
    DBG.println("[alfhw] " + msg);
}

Org_Metadata_Zimbra.prototype.info = function(msg) {
    this.displayStatusMessage(msg);
    this.debug(msg);
}

// handler for menu items that do not have <actionURL>
// (see xml file for details on the menu items)
Org_Metadata_Zimbra.prototype.menuItemSelected = function(itemId) {
    switch (itemId) {
        case "AboutMetadata":
            this.displayAboutMetadataZimlet();
            break;
        case "PREFERENCES":
            this.createPropertyEditor();
            break;
    }
}

// display basic information about metadata.vn. It can also serve as a test of
// the connection to metadata.vn.
Org_Metadata_Zimbra.prototype.displayAboutMetadataZimlet = function() {

    var view = new DwtComposite(this.getShell());
    var args = {
        title : messageStrings["aboutText"],
        view : view
    };
    var dlg = this._createDialog(args);

    var alfTicket = this.getTicket();

    if (alfTicket == null) {

        view.getHtmlElement().innerHTML = messageStrings["failedToConnectMetadata"];

    } else {

        var alfurl = this.getAlfUrl();
        // var alfAboutWSUrl = ["http://",alfurl,ALF_WCWS_URL_PREFIX,"/zimbra/about","?ticket=",alfTicket].join("");
        var alfAboutWSUrl = [ "", alfurl, ALF_WCWS_URL_PREFIX, "/zimbra/about",
        "?ticket=", alfTicket ].join("");
        var hwUrl = ZmZimletBase.PROXY
        + AjxStringUtil.urlComponentEncode(alfAboutWSUrl);
        var hwResult = AjxRpc.invoke(null, hwUrl, null, null, true);
        var myObject = eval('(' + hwResult.text + ')');

        var info = "<table>";
        info += "<tr><td><b>Server URL</b></td><td>" + alfurl
        + "</td></tr>";
        info += "<tr><td><b>Server Version</b></td><td>" + myObject.version
        + "</td></tr>";
        info += "<tr><td><b>Server Edition</b></td><td>" + myObject.edition
        + "</td></tr>";
        info += "<tr><td><b>User Id</b></td><td>" + myObject.userId
        + "</td></tr>";
        info += "<tr><td><b>User Name</b></td><td>" + myObject.fullName
        + "</td></tr>";
        info += "</table>";

        view.getHtmlElement().innerHTML = info;

    }
    dlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this,
        function() {
            dlg.popdown();
            dlg.dispose();
        }));
    dlg.setButtonListener(DwtDialog.CANCEL_BUTTON, new AjxListener(this,
        function() {
            dlg.popdown();
            dlg.dispose();
        }));
    dlg.popup();
}

// retrieve metadata ticket for webscript service calls.
Org_Metadata_Zimbra.prototype.getTicket = function() {

    // this.ticket = $.cookie('ticket');	// TODO: read Metadata.vn ticket from cookie

    // Check if we already have the ticket
    if (this.ticket == null) {
        this.ticket = this.login();

    } else {
        var alfTicket = this.readCookie('alfresco_ticket');

        // If yes, validate the ticket
        if ((alfTicket === null || alfTicket === '') && !this.validateTicket()) {
            this.ticket = this.login();
        }
    }
    return this.ticket;
}

// validate the ticket. If it expires, try to renew it.
Org_Metadata_Zimbra.prototype.validateTicket = function() {

    /*
        var alfurl = this.getUserProperty("alfurl");
	if (!alfurl)
		alfurl = this._zimletContext.getConfig("alfurl");
    */
    var alfurl = this.getAlfUrl();

    var password = this.getUserProperty("password");
    if (!password)
        password = this._zimletContext.getConfig("password");

    var user = this.getUserProperty("user");
    if (!user)
        user = this._zimletContext.getConfig("user");

    if (this.ticket == null) {
        return false;
    } else {

        // var validationUrl = ["http://",alfurl,ALF_TICKET_SERVICE_URL,this.ticket].join("");
        var validationUrl = [ "", alfurl, ALF_TICKET_SERVICE_URL, this.ticket ]
        .join("");
        var proxyUrl = ZmZimletBase.PROXY
        + AjxStringUtil.urlComponentEncode(validationUrl) + "&user="
        + user + "&pass=" + password + "&auth=basic";
        var result = AjxRpc.invoke(null, proxyUrl, null, null, true);

        if (result.success) {
            var xmlDoc = AjxXmlDoc.createFromXml(result.text);
            var firstNode = xmlDoc._doc.firstChild;
            if (firstNode.tagName == "ticket") {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}

Org_Metadata_Zimbra.prototype.login = function() {

    var password = this.getUserProperty("password");
    if (!password)
        password = this._zimletContext.getConfig("password");

    var user = this.getUserProperty("user");
    if (!user)
        user = this._zimletContext.getConfig("user");

    var alfurl = this.getAlfUrl();
    // var alfLoginUrl = ["http://",alfurl,ALF_LOGIN_SERVICE_URL,"?u=",user,"&pw=",password].join("");
    var alfLoginUrl = [ "", alfurl, ALF_LOGIN_SERVICE_URL, "?u=", user, "&pw=",
    password ].join("");
    var proxyUrl = ZmZimletBase.PROXY
    + AjxStringUtil.urlComponentEncode(alfLoginUrl);

    var result = AjxRpc.invoke(null, proxyUrl, null, null, true);

    if (result.success) {
        var xmlDoc = AjxXmlDoc.createFromXml(result.text);
        var firstNode = AjxEnv.isIE ? xmlDoc._doc.childNodes[1]
        : xmlDoc._doc.childNodes[0];

        if (firstNode.tagName == "ticket") {
            return firstNode.firstChild.nodeValue;
        } else {
            return null;
        }
    } else {
        return null;

    }
}

/*************************************************************************************************************************/
// ADD ATTACHMENT FROM METADATA.VN
/*************************************************************************************************************************/

// add the alfreco document selection dialog box to the attach files page
Org_Metadata_Zimbra.prototype.addMetadataTabToAttachDialog = function() {
    metadataAttachConfig.alfUrl = this.getAlfUrl();
    metadataAttachConfig.alfTicket = this.getTicket();

    var attachDialog = this._attachDialog = appCtxt.getAttachDialog();
    var tabview = attachDialog ? attachDialog.getTabView() : null;
    this.ATV = new MetadataAttachView(attachDialog, tabview, this);
    var tabkey = attachDialog.addTab("metadata", messageStrings["addAttachmentMetadataDocuments"], this.ATV);
    var callback = new AjxCallback(this.ATV, this.ATV.onAttachDocuments);
    attachDialog.addOkListener(tabkey, callback);
}

// (event handler) called when Metadata documents are selected for attachment
Org_Metadata_Zimbra.prototype.onCheckDocuments = function(type, args) {
    //Populate the list of selected metadata documents
    var isDocument = type.data.isDocument;
    var name = type.data.label;
    //var src = "http://"+args.alfurl+type.data.src;
    var src = "" + args.alfurl + type.data.src;
}

MetadataAttachView.prototype.isInline = function() {
    return this._attachDialog.isInline();
}

// (event handler) called when Metadata documents are selected for attachment
MetadataAttachView.prototype.onAttachDocuments = function() {
    this.attach_documents = this.getSelectedDocuments();
    this.attach_current = -1;
    this.attachment_ids = [];

    this.showAttachingDocuments(); /* display progress */
    var callback = new AjxCallback(this, this.uploadFiles);
    this.retreiveDocumentsFromMetadata(callback);
}

/* get all <img> nodes selected for attachment */
MetadataAttachView.prototype.getSelectedDocuments = function() {
    var documents = [];
    var nodes = this.getCheckNodes();

    if (nodes != null) {
        var counter = 0;

        for ( var i = 0; i < nodes.length; i++) {
            if (nodes[i].data.isDocument) {
                var document = {};
                // document.src = "http://"+this._zimlet.getAlfUrl()+nodes[i].data.src+"?ticket="+this._zimlet.getTicket();
                document.src = "" + this._zimlet.getAlfUrl()
                + nodes[i].data.src + "?ticket="
                + this._zimlet.getTicket();
                document.name = nodes[i].data.label;
                document.path = nodes[i].data.path;
                // document.dlink = "http://"+this._zimlet.getAlfUrl()+nodes[i].data.dlink;
                document.dlink = "" + this._zimlet.getAlfUrl()
                + nodes[i].data.dlink;
                // document.shortlink = "http://"+this._zimlet.getAlfUrl()+nodes[i].data.shortlink;
                document.shortlink = "" + this._zimlet.getAlfUrl()
                + nodes[i].data.shortlink;
                documents[counter] = document;
                counter++;
            }
        }
    }
    return documents;
}

MetadataAttachView.prototype.uploadFiles = function() {

    // attachmentIds = this.attachment_ids.join(",");
    attIds = [];
    var items = this.attachment_ids;

    for ( var i in items) {
        attIds.push({
            aid : items[i].id,
            id : null
        });
    }

    var callback = this._attachDialog.getUploadCallback();
    if (callback) {
        callback.run(AjxPost.SC_OK, attIds, null);
    }

    this.attach_documents = [];
    this.attach_current = -1;
    this.attachment_ids = [];
};

// upload a document to the zimbra file-upload servlet
MetadataAttachView.prototype.retreiveDocumentsFromMetadata = function(callback) {
    var i = this.attach_current;
    var l = this.attach_documents.length;
    if (i == (l - 1)) {
        // we have finished attaching all documents
        this.debug("Attached " + l + " Metadata documents");
        callback.run();
    } else {
        i = i + 1; // starts at -1, so ++ for 0-based index
        var doc = this.attach_documents[i];
        var src = doc.src;
        var filename = doc.name;

        var params = [ "upload=1", "&", "fmt=raw", "&", "filename=", filename ]
        .join("");
        var server_url = ZmZimletBase.PROXY
        + AjxStringUtil.urlComponentEncode(src) + "&" + params;
        var cb = new AjxCallback(this, this.doneAttachDocument, [ callback ]);
        AjxRpc.invoke(null, server_url, null, cb, true);
    }
}

// invoked as a callback when a single document has been attached
MetadataAttachView.prototype.doneAttachDocument = function(callback, result) {
    this.attach_current = this.attach_current + 1;
    this.debug("<xmp>" + result.text + "</xmp>");

    var resultText = result.text;
    this.showAttachProgress();
    // result.text is some html code with embedded strings inside ''
    var properties = resultText.split(",");

    if (properties[0] == "200") {
        var attachmentId = properties[2].replace("'", "").replace("'", "");

        //	   this.attachment_ids.push ( {id: attachmentId, ct: ""} );
        this.attachment_ids.push({
            id : attachmentId.trim(),
            ct : "text/pdf",
            s : 10000
        });
    } else {
        alert("Proxy returned HTTP Error code: " + properties[0]);
    }
    this.retreiveDocumentsFromMetadata(callback);
}

MetadataAttachView.prototype.showAttachingDocuments = function() {
    this.showElement(this.getApDiv());
}

/* Updates the view of attaching documents */
MetadataAttachView.prototype.showAttachProgress = function() {
    Metadata_clearElement(this.getApprogressDiv());
    this.getApprogressDiv().appendChild(
        document.createTextNode(messageStrings["addAttachmentAttaching1"]
            + (this.attach_current + 1) + "/"
            + this.attach_documents.length + " "
            + messageStrings["addAttachmentAttaching2"]));
}

MetadataAttachView.prototype._createProgressDivs = function() {

    var apDiv = document.createElement("div");
    apDiv.className = "Metadata_busyMsg";

    /* the 'work in progress' image */
    var apbusyDiv = document.createElement("div");
    var busyimg = document.createElement("img");
    busyimg.setAttribute("src", METADATA_BUSYIMGURL);
    apbusyDiv.appendChild(busyimg);
    apDiv.appendChild(apbusyDiv);

    /* the progress text div */
    var approgressDiv = document.createElement("div");
    approgressDiv.appendChild(document.createTextNode(messageStrings["waitForAttaching"]));
    apDiv.appendChild(approgressDiv);

    this.apDiv = apDiv;
    this.approgressDiv = approgressDiv;
};

MetadataAttachView.prototype.getApprogressDiv = function() {
    if (!this.approgressDiv) {
        this._createProgressDivs();
    }
    return this.approgressDiv;
};

MetadataAttachView.prototype.getApDiv = function() {
    if (!this.apDiv) {
        this._createProgressDivs();
    }
    return this.apDiv;
};

/* Utility functions for debugging */
MetadataAttachView.prototype.debug = function(msg) {
    DBG.println("[BM] " + msg);
};

MetadataAttachView.prototype.info = function(msg) {
    this.displayStatusMessage(msg);
    this.debug(msg);
};

/********************************************************************************************************************************************
 // END OF ATTACHMENT UPLOADING
 /********************************************************************************************************************************************

 /* For uploading attachments to Metadata */
Org_Metadata_Zimbra.prototype.addAttachmentHandler = function() {
    this._msgController = AjxDispatcher.run("GetMsgController");
    this._msgController._initializeListView(ZmId.VIEW_MSG);

    // Any better way to add attachment link?

    //var attLinksDiv = document.getElementById(this._msgController._listView[ZmId.VIEW_MSG]._attLinksId);
    //attLinksDiv.innerHTML += "I am here";

    for ( var mimeType in ZmMimeTable._table) {
        this._msgController._listView[ZmId.VIEW_MSG].addAttachmentLinkHandler(
            mimeType, "metadata", this.addSaveToMetadataLink);
    }

    for ( var i = 0; i < AlfMimeTable.list.length; i++) {
        this._msgController._listView[ZmId.VIEW_MSG].addAttachmentLinkHandler(
            AlfMimeTable.list[i], "metadata", this.addSaveToMetadataLink);
    }
}

Org_Metadata_Zimbra.prototype.addSaveToMetadataLink = function(attachment) {
    var html = "<a href='#' class='AttLink' style='text-decoration:underline;' "
    + "onClick=\"window.Metadata_widget.onSaveToMetadata('"
    + attachment.ct
    + "','"
    + attachment.label
    + "','"
    + attachment.url
    + "');\">" + messageStrings["saveToMetadataMenu"] + "</a>";
    return html;
}

/* Handle 'Save to Metadata.vn' action */
Org_Metadata_Zimbra.prototype.onSaveToMetadata = function(ct, label, src) {

    var uploadDlg = this._getUploadDlg();
    var d = uploadDlg._getContentDiv(); /* Initialize the Upload Dialog */
    Metadata_clearElement(d);

    var div = document.createElement("div");
    div.className = "Metadata_hCenter";

    var imgI = document.createElement("img");
    imgI.setAttribute("src", src);

    var pathMsg = document.createElement("div");
    pathMsg.className = "Metadata_hLeft";
    pathMsg.appendChild(document.createTextNode(messageStrings["saveToMetadataSpace"] + ": "));

    var pathHelpMsg = document.createElement("div");
    pathHelpMsg.className = "Metadata_hLeft_hint";
    pathHelpMsg.appendChild(document.createTextNode(messageStrings["saveToMetadataSpaceHint1"]));
    pathHelpMsg.appendChild(document.createElement("br"));
    pathHelpMsg.appendChild(document.createTextNode(messageStrings["saveToMetadataSpaceHint2"]));

    var pathS = document.createElement("div");
    pathS.className = "Metadata_hLeft";
    pathS.id = "spacepathinputdiv";
    pathS.setAttribute("style", "width: 460px;");
    var pathI = document.createElement("input");
    pathI.id = "spacepathinput";
    pathS.appendChild(pathI);

    var containerI = document.createElement("div");
    containerI.id = "spacepathcontainer";
    pathS.appendChild(pathI);
    pathS.appendChild(containerI);

    var titleMsg = document.createElement("div");
    titleMsg.className = "Metadata_hLeft";
    titleMsg.appendChild(document.createTextNode(messageStrings["saveToMetadataTitle"]+": "));

    var titleS = document.createElement("div");
    titleS.className = "Metadata_hLeft";
    var titleI = document.createElement("input");
    titleI.setAttribute("size", "65");
    titleI.value = label;
    titleS.appendChild(titleI);

    var descMsg = document.createElement("div");
    descMsg.className = "Metadata_hLeft";
    descMsg.appendChild(document.createTextNode(messageStrings["saveToMetadataDescription"]+": "));

    var descS = document.createElement("div");
    descS.className = "Metadata_hLeft";
    var descI = document.createElement("textarea");
    descS.appendChild(descI);

    var tagsS = document.createElement("div");
    tagsS.className = "Metadata_hLeft";
    tagsS.appendChild(document.createTextNode(messageStrings["saveToMetadataTags"]+": "));
    var tagsI = document.createElement("input");
    tagsS.appendChild(tagsI);

    var brS = document.createElement("br");
    var brS1 = document.createElement("br");
    var brS2 = document.createElement("br");
    var brS3 = document.createElement("br");
    var brS4 = document.createElement("br");

    div.appendChild(titleMsg);
    div.appendChild(titleS);
    div.appendChild(descMsg);
    div.appendChild(descS);
    // div.appendChild(tagsS);		// Input for tags...
    div.appendChild(pathMsg);
    div.appendChild(pathHelpMsg);
    div.appendChild(pathS);
    div.appendChild(brS);
    div.appendChild(brS1);
    d.appendChild(div);

    uploadDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this,
        function() {
            this.onConfirmSaveToMetadata(ct, label, src, pathI.value,
                titleI.value, descI.value, tagsI.value);
        }));
    uploadDlg.setButtonListener(DwtDialog.CANCEL_BUTTON, new AjxListener(this,
        function() {
            uploadDlg.popdown();
        }));

    uploadDlg.popup();

    this.setupSpacePathAutoComplete();
}

/* Setup space path autocomplete using YUI AutoComplete widget */
Org_Metadata_Zimbra.prototype.setupSpacePathAutoComplete = function() {
    var alfTicket = this.getTicket();

    /*
    var alfurl = this.getUserProperty("alfurl");
    if (!alfurl)
        alfurl = this._zimletContext.getConfig("alfurl");
    */
    var alfurl = this.getAlfUrl();

    // var alfEasyNavWSUrl = ["http://",alfurl,ALF_WCWS_URL_PREFIX,"/easy/nav","?ticket=",alfTicket].join("");
    var alfEasyNavWSUrl = [ "", alfurl, ALF_WCWS_URL_PREFIX, "/easy/nav",
    "?ticket=", alfTicket ].join("");
    this.oACDS = new YAHOO.widget.DS_ScriptNode(alfEasyNavWSUrl, [ "nodeList",
        "path" ]);
    this.oACDS.scriptQueryParam = "query";

    // Instantiate AutoComplete
    this.oAutoComp = new YAHOO.widget.AutoComplete("spacepathinput",
        "spacepathcontainer", this.oACDS);
    this.oAutoComp.formatResult = function(oResultItem, sQuery) {
        return "<div class=\"result\"> &nbsp;<span class=\"name\">"
        + oResultItem[0] + "</span></div>";
    };

    // Stub for form validation
    this.validateForm = function() {
        // Validation code goes here
        return true;
    };
}

/* Upload a single attachment to Metadata */
Org_Metadata_Zimbra.prototype.onConfirmSaveToMetadata = function(ct, label,
    src, path, title, desc, tags) {
    /* Show a busy message indicating that the file is being uploaded */
    var busy = document.createElement("div");
    busy.className = "Metadata_hCenter";

    var busyImgS = document.createElement("span");
    busyImgS.className = "Metadata_hCenter";
    var busyImg = document.createElement("img");
    busyImg.setAttribute("src", METADATA_BUSYIMGURL);
    busyImgS.appendChild(busyImg);

    var busyTextS = document.createElement("span");
    busyTextS.className = "Metadata_hCenter";
    busyTextS.appendChild(document.createTextNode(messageStrings["waitForUploading"]));

    busy.appendChild(busyImgS);
    busy.appendChild(busyTextS);

    var uploadDlg = this._getUploadDlg();
    var d = uploadDlg._getContentDiv();
    Metadata_clearElement(d);

    d.appendChild(busy);

    uploadDlg.setButtonEnabled(DwtDialog.OK_BUTTON, false);
    uploadDlg.setButtonEnabled(DwtDialog.CANCEL_BUTTON, false);

    title = title || "";
    tags = tags || "";

    /* Make a call to zimbra.jsp to upload the selected document to Metadata */

    var alfTicket = this.getTicket();

    var url = this.getResource("zimbra.jsp");
    var metadataparams = [ [ "ticket", alfTicket ] ];
    if (path.length > 0) {
        metadataparams.push([ "path", path ]);
    }
    if (title.length > 0) {
        metadataparams.push([ "title", title ]);
    }
    if (desc.length > 0) {
        metadataparams.push([ "desc", desc ]);
    }
    if (tags.length > 0) {
        metadataparams.push([ "tags", tags ]);
    }


    /*
    var alfurl = this.getUserProperty("alfurl");

    if (!alfurl)
        alfurl = this._zimletContext.getConfig("alfurl");

    if (!alfurl)
        alfurl = this.readCookie('metadata_url');
    */
    var alfurl = this.getAlfUrl();

    var params = [ "src=" + AjxStringUtil.urlComponentEncode(src),
    "alfurl=" + alfurl, "ticket=" + alfTicket,
    "name=" + AjxStringUtil.urlEncode(label),
    "path=" + AjxStringUtil.urlEncode(path),
    "title=" + AjxStringUtil.urlEncode(title),
    "desc=" + AjxStringUtil.urlEncode(desc),
    "tags=" + AjxStringUtil.urlEncode(tags) ].join("&");

    var callback = new AjxCallback(this, this.onDoneSaveToMetadata);
    AjxRpc.invoke(null, url + "?" + params, null, callback, true);
}

Org_Metadata_Zimbra.prototype._getUploadDlg = function() {
    if (!this.uploadDlg) {
        this.uploadDlg = new DwtDialog(appCtxt.getShell(), null, messageStrings["saveToMetadataSave"],
            [ DwtDialog.OK_BUTTON,
            DwtDialog.CANCEL_BUTTON ]);
    }
    return this.uploadDlg;
};

/* Callback function after a document has been uploaded to Metadata
 @result  contains the result of the Metadata upload operation
 */
Org_Metadata_Zimbra.prototype.onDoneSaveToMetadata = function(result) {
    var uploadDlg = this._getUploadDlg();

    var d = uploadDlg._getContentDiv();
    Metadata_clearElement(d);

    var jso = null;

    try {

        jso = eval('(' + result.text + ')');

        this.debug("Metadata Upload - status=" + jso.status);
        this.debug("Metadata Upload - result=")
        this.debug("<xmp>" + result.text + "</xmp>");
    } catch (e) {
        this.debug("Metadata Upload Failed:");
        this.debug(e.toString());
    }

    var statusS = document.createElement("span");
    statusS.className = "Metadata_hCenter";
    var detailS = document.createElement("span");
    detailS.className = "Metadata_hCenter";

    if (jso.status) {
        statusS.appendChild(document.createTextNode(messageStrings["uploadSuccess"]));
        // detailS.appendChild(document.createTextNode(messageStrings["Message"] + ": " + jso.msg));
        detailS.appendChild(document.createTextNode(""));
    } else {
        statusS.appendChild(document.createTextNode(messageStrings["uploadFailed"]));
        this.debug("<xmp>" + result.text + "</xmp>");
    }

    d.appendChild(statusS);
    d.appendChild(detailS);

    uploadDlg.setButtonEnabled(DwtDialog.OK_BUTTON, true);
    uploadDlg.setButtonEnabled(DwtDialog.CANCEL_BUTTON, true);

    uploadDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this,
        function() {
            uploadDlg.popdown();
        }));
    uploadDlg.setButtonListener(DwtDialog.CANCEL_BUTTON, new AjxListener(this,
        function() {
            uploadDlg.popdown();
        }));
    if (!uploadDlg.isPoppedUp()) {
        uploadDlg.popup();
    }

    uploadDlg.setLocation(200, 200);

}

Org_Metadata_Zimbra.prototype.msgDropped = function(msg) {
    var links = msg.attLinks;
    if ((links != null) && (links.length != 0)) {
        this.attLinks = links;
    }
}

Org_Metadata_Zimbra.prototype.addMsg = function(msg) {
    // locate the composer control and set up the callback handler
    var composer = appCtxt.getApp(ZmApp.MAIL).getComposeController();

    composer._composeView._htmlEditor.setContent(composer._getBodyContent()
        + " " + msg);

}

/* removes all child nodes of a dom element */
function Metadata_clearElement(el) {
    if (!el) {
        return;
    }
    while (el.childNodes.length > 0) {
        var firstchild = el.childNodes[0];
        el.removeChild(firstchild);
        firstchild = null;
    }
}

MetadataAttachView.prototype.toString = function() {
    return "MetadataAttachView";
}

MetadataAttachView.prototype.gotAttachments = function() {
    return (this.getSelectedDocuments().length > 0);
}

MetadataAttachView.prototype._createProgressDivs = function() {

    var apDiv = document.createElement("div");
    apDiv.className = "Metadata_busyMsg";

    /* the 'work in progress' image */
    var apbusyDiv = document.createElement("div");
    var busyimg = document.createElement("img");
    busyimg.setAttribute("src", METADATA_BUSYIMGURL);
    apbusyDiv.appendChild(busyimg);
    apDiv.appendChild(apbusyDiv);

    /* the progress text div */
    var approgressDiv = document.createElement("div");
    approgressDiv.appendChild(document.createTextNode(messageStrings["waitForAttaching"]));
    apDiv.appendChild(approgressDiv);

    this.apDiv = apDiv;
    this.approgressDiv = approgressDiv;
};

MetadataAttachView.prototype.getApprogressDiv = function() {
    if (!this.approgressDiv) {
        this._createProgressDivs();
    }
    return this.approgressDiv;
};

MetadataAttachView.prototype.getApDiv = function() {
    if (!this.apDiv) {
        this._createProgressDivs();
    }
    return this.apDiv;
};

MetadataAttachView.prototype._createHtml = function() {
    this._contentEl = this.getContentHtmlElement();
    this._contentEl.innerHTML = "";
    this.treeDiv = document.createElement("div");
    this.treeDiv.id = "treeDiv1";
    this.treeDiv.className = "treeNav";
}

MetadataAttachView.prototype.resetAttachProgress = function() {
    Metadata_clearElement(this.getApprogressDiv());
    this.getApprogressDiv().appendChild(
        document.createTextNode(messageStrings["waitForAttaching"]));
}

// Utility function to show custom text in the attachment dialog. Useful when something else needs to be shown
MetadataAttachView.prototype.showElement = function(el) {
    Metadata_clearElement(this._contentEl);
    this._contentEl.appendChild(el);
}

// Overridden function to draw the (contents of the) Metadata Documents tab in the Attach Files dialog box
MetadataAttachView.prototype.showMe = function() {
    // clear the main view prior to displaying anything
    Metadata_clearElement(this._contentEl);
    this.resetAttachProgress();
    this.showElement(this.treeDiv);

    this._metadataNavTree = new MetadataNavTree(this._zimlet);

    DwtTabViewPage.prototype.showMe.call(this, parent);
    this.setSize(Dwt.DEFAULT, "240");
}

MetadataAttachView.prototype.getCheckNodes = function() {
    return this._metadataNavTree.getCheckedNodes();
}

/*************************************************************************************************************************/
// NAVTREE FOR THE ZIMLET
/*************************************************************************************************************************/

function MetadataNavTree(zimlet) {
    this.tree = null;
    this.currentIconMode = null;
    this._zimlet = zimlet;

    YAHOO.util.Event.on([ "mode0", "mode1" ], "click", this.changeIconMode);

    var el = document.getElementById("mode1");
    if (el && el.checked) {
        this.currentIconMode = parseInt(el.value);
    } else {
        this.currentIconMode = 0;
    }
    this.buildTree();
    var args = {};

    this.tree.subscribe("checkClick", this._zimlet.onCheckDocuments, args);
}

MetadataNavTree.prototype = new Object();
MetadataNavTree.prototype.constructor = MetadataNavTree;

MetadataNavTree.prototype.changeIconMode = function() {
    var newVal = parseInt(this.value); //TODO: value does not exist!!!!
    if (newVal != this.currentIconMode) {
        this.currentIconMode = newVal;
    }
    this.buildTree();
}

function loadNodeData(node, fnLoadComplete) {
    var nodeLabel = encodeURI(node.data.path);

    var alfurl = metadataAttachConfig.alfUrl;
    var alfTicket = metadataAttachConfig.alfTicket;

    // var sUrl = ["http://",alfurl,ALF_WCWS_URL_PREFIX,"/easy/tree","?ticket=",alfTicket,"&p=",nodeLabel,"&callback=alfCallback"].join("");
    var sUrl = [ "", alfurl, ALF_WCWS_URL_PREFIX, "/easy/tree", "?ticket=",
    alfTicket, "&p=", nodeLabel, "&callback=alfCallback" ].join("");
    var result = AjxRpc.invoke(null, ZmZimletBase.PROXY
        + AjxStringUtil.urlComponentEncode(sUrl), null, null, true);

    if (result.success) {
        var alfResult = eval('(' + result.text + ')');

        if (alfResult.children != null) {
            for ( var i = 0, j = alfResult.children.length; i < j; i++) {
                if (!alfResult.children[i].isDocument) {
                    var tempNode = new YAHOO.widget.AlfNode(
                        alfResult.children[i], node, false, false);
                    tempNode.isCheckDisabled = true;
                }
            }

            for ( var i = 0, j = alfResult.children.length; i < j; i++) {
                if (alfResult.children[i].isDocument) {
                    var tempNode = new YAHOO.widget.AlfNode(
                        alfResult.children[i], node, false, false);
                    tempNode.isLeaf = true;
                }
            }

        }
        node.loadComplete();
    }
}

MetadataNavTree.prototype.buildTree = function() {
    //create a new tree:
    this.tree = new YAHOO.widget.TreeView("treeDiv1");

    //turn dynamic loading on for entire tree:
    loadNodeData._zimlet = this._zimlet;
    this.tree.setDynamicLoad(loadNodeData, this.currentIconMode);

    //get root node for tree:
    var root = this.tree.getRoot();

    //add child nodes for tree; our top level nodes are
    //all the states in India:
    var companyHome = {
        /* label : "Company Home",
		path : "/Company Home",
		title : "Company Home" */
        label : "/",
        path : "/",
        title : "/"
    };
    var tempNode = new YAHOO.widget.AlfNode(companyHome, root, false, false);
    tempNode.isCheckDisabled = true;

    //render tree with these toplevel nodes; all descendants of these nodes
    //will be generated as needed by the dynamic loader.
    this.tree.draw();
}

MetadataNavTree.prototype.getCheckedNodes = function(nodes) {
    nodes = nodes || this.tree.getRoot().children;
    var checkedNodes = [];

    for ( var i = 0, l = nodes.length; i < l; i = i + 1) {
        var n = nodes[i];

        //if (n.checkState > 0) { // if we were interested in the nodes that have some but not all children checked
        if (n.checkState === 2) {
            checkedNodes.push(n); // just using label for simplicity
        }

        if (n.hasChildren()) {
            checkedNodes = checkedNodes
            .concat(this.getCheckedNodes(n.children));
        }
    }
    return checkedNodes;
}

// (event handler) called when metadata documents are selected for attachment
// display list of selected documents with download and short links.
MetadataNavTree.prototype.onCheckDocuments = function(type, args) {
    //Populate the list of selected metadata documents
    var isDocument = type.data.isDocument;
    var name = type.data.label;
    var src = type.data.src;
    var view = new DwtComposite(this._zimlet.getShell());

    // TODO: ???
    var args = {
        title : messageStrings["selectedDocuments"],
        view : view
    };

    var dlg = this._zimlet._createDialog(args);
    var info = "<table class='Metadata_iTable'><tr><th>"
    + messageStrings["selectedDocumentsName"] + "</th><th>"
    + messageStrings["selectedDocumentsPath"] + "</th><th>"
    + messageStrings["selectedDocumentsActions"] + "</th></tr>";
    var docs = this._zimlet.ATV.getSelectedDocuments();

    if (docs != null) {
        for ( var i = 0; i < docs.length; i++) {
            var docSrc = docs[i].src;
            var docName = docs[i].name;
            var docPath = docs[i].path;
            var docDLink = docs[i].dlink;
            var docShortLink = "<a href=\\'" + docs[i].shortlink + "\\'>"
            + docName + "</a>";
            info += "<tr>";
            info += "<td>" + docName + "</td>";
            info += "<td>" + docPath + "</td>";
            info += "<td><a class='AttLink' style='text-decoration:underline;' href='"
            + docDLink + "'>" + messageStrings["download"] + "</a> | ";
            info += "<a href='#' class='AttLink' style='text-decoration:underline;' onClick=\"window.Metadata_widget.addMsg('"
            + docShortLink
            + "' \">"
            + messageStrings["pasteSortLink"]
            + "</a></td>";
            info += "</tr>";
        }
    }

    info += "</table>";
    view.getHtmlElement().innerHTML = info;

    dlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this,
        function() {
            dlg.popdown();
            dlg.dispose();
        }));
    dlg.setButtonListener(DwtDialog.CANCEL_BUTTON, new AjxListener(this,
        function() {
            dlg.popdown();
            dlg.dispose();
        }));
    dlg.popup();
}
