/**********************************************************************
	 htmlgui_api.js

$Comment: provides api functions to HTML pages, that embed ixmaps maps
$Source : htmlgui_api.js,v $

$InitialAuthor: guenter richter $
$InitialDate: 2011/10/29 $
$Author: guenter richter $
$Id: htmlgui_api.js 1 2011-10-29 10:51:41Z Guenter Richter $

Copyright (c) Guenter Richter
$Log: htmlgui_api.js,v $
**********************************************************************/

/** 
 * @fileoverview This file provides iXmaps interface functions for HTML Pages that embed ixmaps maps<br>
 * @author Guenter Richter guenter.richter@medienobjekte.de
 * @version 1.0 
 */

(function( ixmaps, $, undefined ) {

	// ------------------------------------------------
	// workaround for cross domain restrictions
	// send bookmark string to framed map content
	// ------------------------------------------------

	// listen to messages and execute coded functions
	// ----------------------------------------------

	ixmaps.waitCallback = null;
	window.addEventListener("message", receiveMessage, false);  
	function receiveMessage(e)  {
		if ( e.data.match(/executeThis/) ){
			eval(e.data.substr(12,e.data.length-12));
		}else
		if ( e.data.match(/waitForMap/) ){
			ixmaps.waitForEmbeddedMap("map", function(mapApi){
				try{
					parent.ixmaps.embededApi = mapApi;
				}catch (e){}
				parent.postMessage("isMap","*");
			});
		}else
		if ( e.data.match(/isMap/) ){
			ixmaps.waitCallback();
		}
	} 
	
	// send bookmark messages to execute functions in (cross domain) iframes
	// ---------------------------------------------------------------------

	ixmaps.iframe = ixmaps.iframe || {};

	ixmaps.iframe.exec = function(szFrame,szFunction){
		var frame = window.document.getElementById(szFrame);
		if ( frame ){
			frame.contentWindow.postMessage("executeThis:"+szFunction,"*");
		}
	};

	// special function to get a callback if map loaded
	//
	ixmaps.iframe.waitForMap = function(szFrame,callback){
		var frame = window.document.getElementById(szFrame);
		if ( frame ){
			ixmaps.waitCallback = callback;
			frame.contentWindow.postMessage("waitForMap","*");
		}
	};

	// --------------------------------------
	// a) embedded apis will register here
	// --------------------------------------

	/** array to store the api objects of embedded ixmaps windows which have registered to this (HTML) parent */
	ixmaps.embededApi = null; 
	ixmaps.embededApiA = new Array(); 

	/**
	 * register the given api (from an embedded map) with the given name
	 * this makes the api accessable from the parent HTML page
	 * @param api the API object
	 * @param szName the name of the map registering the api (must be given as query parameter '&name=' with the maps URL)
	 * @return void
	 */
	ixmaps.registerApi = function(api,szName){
		ixmaps.embededApi = api;
		ixmaps.embededApiA[szName] = api;
	};

	// -----------------------------------------
	// b) register this api to the parent window
	// -----------------------------------------

	ixmaps.registerMe = function(){
	
		if ( window.opener ){
			ixmaps.parentApi = window.opener.ixmaps;
		}else
		if ( parent ){
			ixmaps.parentApi = parent.window.ixmaps;
		}
		else{
			alert("error: missing parent window for parameter !");
		}
		// register the embedded map,
		// in case the parent page holds more than one embedded map, we can sync them
		if (!ixmaps.szName){
			ixmaps.szName = "map";
		}
		if ( ixmaps.parentApi ){
			try{
				ixmaps.parentApi.registerApi(ixmaps,ixmaps.szName );
			}catch (e){}
		}
	};

	ixmaps.registerMe();

	// generate iframe
	// --------------------------------------
	ixmaps.embedViewer = function(szTargetDiv,szUrl,ixmaps){
		var target = window.document.getElementById(szTargetDiv);
		if ( target ){
			target.innerHTML = "<iframe id=\"myframe\" style=\"border:0;width:100%;height:100%\" src=\""+szUrl+"\" ></iframe>";
		}
	};
	
	// bubble up embeddedSVG
	// --------------------------------------
	ixmaps.setEmbeddedSVG = function(embeddedSVG){
		if ( !this.embeddedSVG ){
			this.embeddedSVG = embeddedSVG;
		}
	};

	// gives the parent a function to wait for the embedded map
	// --------------------------------------
	ixmaps.waitForEmbeddedMap = function(szName,fCallBack){
		if ( !ixmaps.embededApiA[szName] || !ixmaps.embededApiA[szName].embeddedSVG ){
			setTimeout("ixmaps.waitForEmbeddedMap('"+szName+"',"+fCallBack+")",1000);
			return;
		}
		fCallBack(ixmaps.embededApiA[szName]);
	};

	// -----------------------------------------
	// functions to control the mebedded map
	// -----------------------------------------

	/**
	 * selects a theme from the maps legend to be shown(switchd on)
	 * (theme must be preparen with in the maps legend) 
	 * @param szName the name of the embedded map
	 * @param szTheme the name of the theme as shown in the map legend (when in full mode)
	 * @return void
	 */
	ixmaps.checkTheme = function(szName,szTheme){
		try	{
			ixmaps.embededApiA[szName].embeddedSVG.window.map.Api.minimizeThemeLegends();
			ixmaps.embededApiA[szName].embeddedSVG.window.map.Api.switchMapTheme(szTheme,'on');
		}catch (e){	}
	};
	/**
	 * load a new map (svg/svgz) into an embed context defined by a registered map name
	 * @param szName the name of the embedded map
	 * @param szUrlMap the url of the SVG map to be loaded
	 * @param szUrlStory [optional] parameter to load and activate a story
	 * @return void
	 */
	ixmaps.loadMap = function(szName,szUrlMap,szUrlStory){
			ixmaps.embededApiA[szName].HTML_setSVGMap(szUrlMap);
			ixmaps.embededApiA[szName].resetStory();
			ixmaps.embededApiA[szName].loadStory(szUrlStory);
	};
	/**
	 * execBookmark
	 * @param szName the name of the embedded map
	 * @param szBookmark the bookmark string
	 * @param fClear if true, clears all previout themes
	 * @return void
	 */
	ixmaps.execBookmark = function(szName,szBookmark,fClear){
			ixmaps.embededApiA[szName].execBookmark(szBookmark,fClear);
	};

	/**
	 * htmlgui_getEnvelopeString
	 * @param szName the name of the embedded map
	 * @param nZoom optional parameter (2,3,4,...) to get a zoomed envelope
	 * @return void
	 */
	ixmaps.htmlgui_getEnvelopeString = function(szName,nZoom){
			return ixmaps.embededApiA[szName].htmlgui_getEnvelopeString(nZoom);
	};

	/**
	 * htmlgui_getThemesString
	 * @param szName the name of the embedded map
	 * @return void
	 */
	ixmaps.htmlgui_getThemesString = function(szName){
			return ixmaps.embededApiA[szName].htmlgui_getThemesString();
	};

	/**
	 * on resize
	 * @param szName the name of the embedded map
	 * @return void
	 */
	ixmaps.onWindowResize = function(szName,box,zoomto){
		ixmaps.embededApiA[szName].onWindowResize(box,zoomto);
	};

	/**
	 * reset
	 * @param szName the name of the embedded map
	 * @return void
	 */
	ixmaps.reset = function(){
		ixmaps.embededApi.embeddedSVG.map.Api.clearAll();
		ixmaps.embededApi.embeddedSVG.map.Api.doZoomMapToFullExtend();
	};

	/**
	 * set map type by id in embedded maps 
	 * @param szId the map type id to be set (e.g. 'satellite');
	 * @return void
	 */
	ixmaps.htmlgui_setMapTypeId = function(szId){
		for ( a in ixmaps.embededApiA ){
			ixmaps.embededApiA[a].htmlgui_setMapTypeId(szId);
		}
	};

	// -----------------------------------------
	// functions to synchronize two embedded maps
	// -----------------------------------------

	/**
	 * sync slave maps 
	 * (embedded maps that have been rigistered with a name) 
	 * @param masterApi the api of the map that gives the new envelope
	 * @param ptSW south west point of the new envelope
	 * @param ptSW north east point of the new envelope
	 * @param nZoom html map zoom to set, overrides the zoom of the envelope, necessary because the html map can only have integer zoom levels 
	 * @return void
	 */
	ixmaps.masterApi = null;
	ixmaps.syncEmbed = function(masterApi,ptSW,ptNE,nZoom){
		if ( (ixmaps.masterApi != null) && (ixmaps.masterApi != masterApi) ){
			return;
		}
		ixmaps.masterApi = masterApi;
		for ( a in ixmaps.embededApiA ){
			if ( ixmaps.embededApiA[a] != masterApi ){
				ixmaps.embededApiA[a].syncEmbedMap(ptSW,ptNE,nZoom);
			}
		}
		setTimeout("ixmaps.masterApi = null",1000);
	};

	ixmaps.fullScreenMap = function(szTemplateUrl){
		for ( a in ixmaps.embededApiA ){
			ixmaps.embededApiA[a].fullScreenMap(szTemplateUrl);
		}
	};


	/**
	 * helper function to set attribute "unselectable" = "on"  
	 * @return true or false
	 */
	ixmaps.makeUnselectable = function(szNodeId) {
		var node = window.document.getElementById(szNodeId);
		if ( node ){
			if (node.nodeType == 1) {
				node.setAttribute("unselectable","on");
			}
			var child = node.firstChild;
			while (child) {
				this.makeUnselectable(child);
				child = child.nextSibling;
			}
		}
	};

	ixmaps.htmlgui_onInfoDisplayExtend = function(svgDoc,szId){
		return ixmaps.parentApi.htmlgui_onInfoDisplayExtend(svgDoc,szId);
	};

	ixmaps.htmlgui_onNewTheme = function(szId){
		ixmaps.parentApi.htmlgui_onNewTheme(szId);
	};

	ixmaps.htmlgui_onRemoveTheme = function(szId){
		ixmaps.parentApi.htmlgui_onRemoveTheme(szId);
	};

	ixmaps.htmlgui_onZoomAndPan = function(){
		ixmaps.parentApi.htmlgui_onZoomAndPan();
	};

	ixmaps.htmlgui_onZoomAndPan = function(){
		ixmaps.parentApi.htmlgui_onZoomAndPan();
	};

}( window.ixmaps = window.ixmaps || {} ));

// .............................................................................
// EOF
// .............................................................................

