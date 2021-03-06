// load the HTTPS Everywhere component
var HTTPSEverywhere = null;
try {
  HTTPSEverywhere = Components.classes["@eff.org/https-everywhere;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;
} catch(e) {
  // HTTPS Everywhere doesn't seem to be installed
}

// attach testRunner to the HTTPS Everywhere component so that status.js can run it
if(HTTPSEverywhere) {
  HTTPSEverywhere.httpseRulesetTests = {
    testRunner: testRunner
  };
}


function openStatus() {
  // make sure mixed content blocking preferences are correct
  Services.prefs.setBoolPref("security.mixed_content.block_display_content", false);
  Services.prefs.setBoolPref("security.mixed_content.block_active_content", true);
   
  // open the status tab
  var statusTab = gBrowser.addTab('chrome://https-everywhere/content/ruleset-tests-status.xul');
  gBrowser.selectedTab = statusTab;
}

function testRunner() {
  Components.utils.import("resource://gre/modules/PopupNotifications.jsm");
  
  const numTabs = 6;
  var finished = false;
  var output = [];
  var urls = [];
  var num = 0;
 
  for(var target in HTTPSEverywhere.https_rules.targets) {
    if(!target.indexOf("*") != -1)  {
      urls.push({ 
        url: 'https://'+target, 
        target: target, 
        ruleset_names: HTTPSEverywhere.https_rules.targets[target]
      });
    }
  }

  function test() {
    var i;
 
    HTTPSEverywhere.httpseRulesetTests.updateStatusBar(num, urls.length); 

    // start loading all the tabs
    window.focus
    for(i=0; i<numTabs; i++) {
      newTab(num);
    }
  }

  function newTab(number) {
    num +=1;
    // start a test in this tab
    if(urls.length) {

      // open a new tab
      var tab = gBrowser.addTab(urls[number].url);

      // wait for the page to load
      var intervalId = window.setTimeout(function(){

        // detect mixed content blocker
        if(PopupNotifications.getNotification("mixed-content-blocked", gBrowser.getBrowserForTab(tab))) {
          // build output to log
          ruleset_xmls = '';
          for(let i=0; i<urls[number].ruleset_names.length; i++) {
            ruleset_xmls += urls[number].ruleset_names[i].xmlName + ', ';
          }
          if(ruleset_xmls != '')
            ruleset_xmls = ruleset_xmls.substring(ruleset_xmls.length-2, 2);
          var output = 'MCB triggered: '+urls[number].url+' ('+ruleset_xmls+')';

          HTTPSEverywhere.httpseRulesetTests.updateLog(output);
        }

        // close this tab, and open another
        closeTab(tab);

      }, 10000);

    } else {

      //to run if urls is empty
      if (!finished) { 
        finished = true;
        window.setTimeout(function(){
          gBrowser.removeCurrentTab();
        }, 10000);
      }
    }
  }

  //closes tab
  function closeTab(tab) {
    HTTPSEverywhere.httpseRulesetTests.updateStatusBar(num, urls.length); 

    gBrowser.selectedTab = tab;
    gBrowser.removeCurrentTab();

    // open a new tab, if the tests haven't been canceled
    if(!HTTPSEverywhere.httpseRulesetTests.cancel) {
      newTab(num);
    }
  }

  //manages write out of output mochilog.txt, which contains sites that trigger mcb
  function writeout(weburl) {

    //initialize file
    var file = Components.classes["@mozilla.org/file/directory_service;1"].
    getService(Components.interfaces.nsIProperties).
    get("Home", Components.interfaces.nsIFile);
    writeoutfile = "mochilog.txt";
    file.append(writeoutfile);

    //create file if it does not already exist
    if(!file.exists()) {
      file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
    } 

    //initialize output stream
    var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Components.interfaces.nsIFileOutputStream);

    //permissions are set to append (will not delete existing contents)
    stream.init(file, 0x02 | 0x08 | 0x10, 0666, 0);

    var content = weburl + "\n";

    //Deal with ascii text and write out
    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
      createInstance(Components.interfaces.nsIConverterOutputStream);
    converter.init(stream, "UTF-8", 0, 0);
    converter.writeString(content);
    converter.close();

    //alternative write out if ascii is not a concern
    //stream.write(content,content.length);
    //stream.close();

  }
  test();
}



