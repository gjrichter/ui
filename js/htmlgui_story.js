/**********************************************************************
	 htmlgui_story.js

$Comment: provides story functions to ixmaps
$Source : htmlgui_story.js,v $

$InitialAuthor: guenter richter $
$InitialDate: 2011/10/19 $
$Author: guenter richter $
$Id: htmlgui_story.js 1 2011-10-19 10:51:41Z Guenter Richter $

Copyright (c) Guenter Richter
$Log: htmlgui_story.js,v $
**********************************************************************/

/** 
 * @fileoverview This file provides iXmaps HTML interface functions for map charting stories <br>
 * @author Guenter Richter guenter.richter@medienobjekte.de
 * @version 1.0 
 */

(function( ixmaps, $, undefined ) {

	// globals vars
	ixmaps.storyUrl = null;
	ixmaps.objThemesA = new Array();

	// local vars
	var szStoryRoot = ""; 
	var xmlLegendItems = null; 
	var szTheme = null; 

	// global functions

	/**
	 * reset story root
	 * (called on changing map, important if stories are defined with relativ urls)
	 * @return void
	 */
	ixmaps.resetStory = function(){
		szStoryRoot = ""; 
	};

	/**
	 * loads a story given by szUrl into a HTML <div> with the id "story-board"
	 * (be shure to provide this div in your HTML)
	 * if szUrl is relative it will be applied to the last stories url root
	 * if it is the first story, the url root will be taken from the SVG maps url
	 * @param szUrl the url of the story (may be relative)
	 * @return void
	 */
	ixmaps.loadStory = function(szUrl,szFlag){

		if ( (szUrl == null) || typeof(szUrl) == 'undefined' || (szUrl == 'null') || (szUrl.length == 0) ){
			return;
		}
		/**
		if ( !(this.embeddedSVG || (this.embededApi && this.embededApi.embeddedSVG) ) && (!szFlag || !szFlag.match(/silent/)) ){
			setTimeout("ixmaps.loadStory('"+szUrl+"')",1000);
			return;
		}
		**/
		szUrl = encodeURI(unescape(szUrl));

		// absolute or relative URL 
		// ------------------------
		if ( szUrl.match(/HTTP:\/\//) || szUrl.match(/http:\/\//) || szUrl.match(/\/\//) || szUrl.match(/\//) ) {
			szStoryRoot = ""; 
			urlA = szUrl.split("/");
			for ( var i=0; i<urlA.length-1; i++){
				szStoryRoot += urlA[i]+"/";
			}
			szUrl = urlA[urlA.length-1];
		}

		// relative URL, combine with old story root or if not given, with SVG map root
		// ----------------------------------------------------------------------------
		if ( !szStoryRoot || (szStoryRoot.length == 0) ){
			szStoryRoot = this.szUrlSVGRoot;
		}

		// final URL
		// ---------
		// magick, get rid of ./

		urlA = szUrl.split("./");
		/**
		szUrl = "";
		for ( var i=0; i<urlA.length; i++){
			szUrl += urlA[i];
		}
		**/
		var szStoryFilename = urlA[urlA.length-1];
		ixmaps.storyUrl = szStoryRoot+szUrl;
		if ( szUrl && typeof(szUrl) == "string" && szUrl.length ){

			$('#story-board').load(szStoryRoot+szUrl+' #story', function(response, status, xhr) {
				  if (status == "error") {
					var msg = "Sorry but there was an error: ";
					$("#story").html(msg + xhr.status + "<br><br> '" +szStoryRoot+szUrl+ "'<br><br> " + xhr.statusText);
				  }
				});

			$("head").append($("<link rel='stylesheet' href='"+ szStoryRoot+szUrl.split('.')[0]+".css"+ "' type='text/css' media='screen' />"));

			$.ajax({
                 type: "GET",
                 url: szStoryRoot+szUrl.split('.')[0]+".xml",
                 dataType: "xml",
                 success: function(xml) {
					ixmaps.objThemesA[String(szStoryFilename.split('.')[0])] = xml;
					if ( !szFlag || !szFlag.match(/silent/) ){
						$.getScript(szStoryRoot+szUrl.split('.')[0]+".js");
					}
                 },
                 error: function(xml) {
					if ( !szFlag || !szFlag.match(/silent/) ){
						$.getScript(szStoryRoot+szUrl.split('.')[0]+".js");
					}
                 }
            });
		}
	};

	/**
	 * loads a story given by szUrl into a HTML <div> with the id "story-board"
	 * (be shure to provide this div in your HTML)
	 * if szUrl is relative it will be applied to the last stories url root
	 * if it is the first story, the url root will be taken from the SVG maps url
	 * @param szUrl the url of the story (may be relative)
	 * @return void
	 */
	ixmaps.loadTheme = function(szThemeName,szSourceName,callback){

		if ( (szSourceName == null) || (typeof(szSourceName) == 'undefined') ){
			return;
		}
		if (!this.embeddedSVG && !this.embededApi.embeddedSVG){
			return;
		}

		if ( !szStoryRoot || (szStoryRoot.length == 0) ){
			szStoryRoot = this.szUrlSVGRoot;
		}

		var szUrl = szStoryRoot + szSourceName +".xml";
		if ( szUrl && typeof(szUrl) == "string" && szUrl.length ){
            $.ajax({
                 type: "GET",
                 url: szUrl,
                 dataType: "xml",
                 success: function(xml) {
					ixmaps.objThemesA[szSourceName] = xml;
					callback(szThemeName,szSourceName);
                 },
                 error: function(xml) {
					alert("error on loadTheme(): "+szSourceName+" not found!");
                 }
            });
		}
	};

	/**
	 * get the theme definition string for a theme
	 * (looks for any loaded theme)
	 * @param szThemeName the name of the theme
	 * @type string
	 * @return an executable theme definition string (javascript function call)
	 */
	ixmaps.getTheme = function(szThemeName,szSourceName){

		var szTheme = null;
		for ( a in ixmaps.objThemesA )	{
			if ( !szSourceName || (szSourceName == a) ){
				$(ixmaps.objThemesA[a]).find('LEGENDITEM').each(function(){
					if ( $(this).attr('name') == szThemeName ){
						szTheme = $(this).attr('onactivate').replace(/\n/gi,"");
					}
				}); //close each(
			}
		}
		if ( szTheme == null ){
			alert("error on getTheme(): '"+szThemeName+"' not found!");
		}
		return szTheme;
	};

	/**
	 * add a theme to the map
	 * looks for the requested theme
	 * if a theme source given, controls if it has already been loaded, if not tries to load the source first
	 * if the theme is found, it is executed and added to th current map
	 * @param szThemeName the name of the theme to add
	 * @param szSourceName the name of the theme source
	 * @return void
	 */
	ixmaps.addTheme = function(szThemeName,szSourceName){

		if ( szSourceName ){
			if ( !ixmaps.objThemesA[szSourceName] ){
				ixmaps.loadTheme(szThemeName,szSourceName,ixmaps.addTheme);
				return;
			}
		}
		var szTheme = ixmaps.getTheme(szThemeName,szSourceName);
		if ( szTheme ){
			ixmaps.execBookmark(szTheme,false);
		}
		
	};

	/**
	 * toggle a theme to the map
	 * looks for the requested theme
	 * if a theme source given, controls if it has already been loaded, if not tries to load the source first
	 * if the theme is found, it is executed and added to th current map
	 * @param szThemeName the name of the theme to add
	 * @param szSourceName the name of the theme source
	 * @return void
	 */
	ixmaps.toggleTheme = function(szThemeName,szSourceName){

		if ( szSourceName ){
			if ( !ixmaps.objThemesA[szSourceName] ){
				ixmaps.loadTheme(szThemeName,szSourceName,ixmaps.toggleTheme);
				return;
			}
		}
		var szTheme = ixmaps.getTheme(szThemeName,szSourceName);
		if ( szTheme ){
			var theme = (eval('ixmaps.embededApi.embeddedSVG.window.'+szTheme));
			if ( theme == null ){
				// ixmaps.embededApi.clearAll();
			}
		}
	};


}( window.ixmaps = window.ixmaps || {}, jQuery ));

// .............................................................................
// EOF
// .............................................................................

