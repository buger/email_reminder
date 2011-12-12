(function() {
  var Reminder, locations, menu_link_style, menu_template, template, wait_for_sent;

  wait_for_sent = null;

  locations = [];

  template = "<tr>    <td class='eD'>&nbsp;</td>    <td>        <div id='emailReminder'>            <form style='font-size:12px; float:left; height: 25px;'>                <label><span class='dT'>Remind me</span></label>                <select style='padding: 2px  0;' name='ifResponse' id='emailReminderCondition' >                    <option value='conditional'>if I don't hear back</option>                    <option value='always'>even if someone replies</option>                </select>                <div id='emailReminderDelay' style='display:inline-block'>                    <div id='emailReminder-send' class='Pl J-J5-Ji'>                        <div id='conditional-caption' aria-haspopup='true' style='-moz-user-select:none; cursor:default; padding: 3px 3px; margin-left: 5px; font-size: 100%;' role='button' class='tk3N6e-I-n2to0e J-Zh-I J-J5-Ji Bq L3' tabindex='0'> never <div class='VP5otc-d2fWKd tk3N6e-I-J3 J-J5-Ji'> </div>                        </div>                    </div>                </div>            </form>        </div>    </td></tr>";

  menu_link_style = 'text-decoration:none;color:inherit;line-height:1.1em;padding: 2px 2.5px 2px 6px;display:block;cursor:pointer;';

  menu_template = "    <div class='J-M AW' role='menu' aria-haspopup='true' aria-activedescendant=''>        <div class='SK AX AW' style='margin-top:-1px;margin-left:5px;z-index:999;list-style:none;width:16em; font-size:100%;'>                <div>                    <a style='" + menu_link_style + "' class='menu-anchor J-N'>never</a>                </div>                <div>                    <a style='" + menu_link_style + "' class='menu-anchor J-N' data-time='" + 3600 + "'>in 1 hour</a>                </div>                <div>                    <a style='" + menu_link_style + "' data-time='" + (3600 * 24) + "' class='menu-anchor J-N'>in 1 day</a>                </div>                <div>                    <a style='" + menu_link_style + "' data-time='" + (3600 * 24 * 2) + "' class='menu-anchor J-N'>in 2 days</a>                </div>                <div>                    <a style='" + menu_link_style + "' data-time='" + (3600 * 24 * 4) + "' class='menu-anchor J-N'>in 4 days</a>                </div>                <div>                    <a style='" + menu_link_style + "' data-time='" + (3600 * 24 * 7) + "' class='menu-anchor J-N'>in 1 week</a>                </div>                <div>                    <a style='" + menu_link_style + "' data-time='" + (3600 * 24 * 14) + "' class='menu-anchor J-N'>in 2 weeks</a>                </div>                <div>                    <a style='" + menu_link_style + "' class='show_notification J-N'>Show sample notification</a>                </div>                <div class='menu-caption' style='margin-left:3px'>By a specific time</div>                <div style='color: #333; font-style: italic; font-size: 0.8em; margin-top: 3px; margin-left: 3px;' class='b4g_menu'>Examples: <strong>\'Monday 9am\'</strong>, <strong>\'Dec 23\'</strong><br>                </div>                <form onsubmit='return false;'>                    <div style='padding-top:3px; vertical-align: middle;' class='b4g_menu'><input style='margin-left: 3px' class='b4g_menu hasDatepicker' type='text' name='time' id='datepicker'>                        <img class='ui-datepicker-trigger' src='https://b4g.baydin.com/site_media/bookmarklet/calendar.gif' alt='...' title='...' style='margin-left: 5px; vertical-align: middle; '>                    </div>                    <div style='color:#969696; margin-left: 3px;'>                        <span id='date-preview' class='b4g_menu' style='color:#327a01;'></span>                    </div>                    <div class='b4g_menu'>                        <input type='submit' value='Confirm' style='margin: 3px 0 5px 3px;' class='b4g_menu'>                    </div>                </form>            </div>        </div>    </div>";

  Reminder = (function() {

    function Reminder() {
      var _this = this;
      window.addEventListener('popstate', function(evt) {
        return _this.locationChanged(evt);
      }, false);
      this.logged = false;
      this.detectDocument();
      console.warn('constructiong');
      chrome.extension.sendRequest({
        method: 'check_auth'
      });
      chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        switch (request.method) {
          case 'logged':
            _this.logged = true;
            return $('#emailReminderAuth', _this.doc).remove();
          case 'notify':
            return _this.showNotification(request.thread_id);
        }
      });
      setInterval(function() {
        return _this.addUI();
      }, 500);
      setInterval(function() {
        return _this.isMessageSend();
      }, 500);
    }

    Reminder.prototype.isMessageSend = function() {
      var message, param, thread_id;
      message = $(".b8.UC .vh", this.doc).text();
      if (message.match(/Your message has been sent/) && wait_for_sent) {
        param = $(".b8.UC .vh #link_undo", this.doc).attr('param');
        thread_id = param.replace("UndoSendParam_", "");
        this.handleEvent(thread_id);
        return wait_for_sent = null;
      }
    };

    Reminder.prototype.locationChanged = function(evt) {
      var hash, prev;
      hash = document.location.hash;
      console.log('location changed', hash);
      switch (true) {
        case hash.match(/#(compose|(?:(?:inbox|draft)\/(.*)))/) !== void 0:
          prev = locations[locations.length - 1];
          if (!RegExp['$2'] && prev !== "#compose") wait_for_sent = null;
          this.addUI();
      }
      return locations.push(hash);
    };

    Reminder.prototype.addUI = function() {
      var container, lastrow, menu;
      var _this = this;
      this.detectDocument();
      if ($("#emailReminderAuth", this.doc).length === 0 && !this.logged) {
        $('<div id="emailReminderAuth"><a href="#">Click Enable Email reminders</a></div>').css({
          color: '#333',
          'font-family': 'Arial',
          background: '#DDE5FF',
          padding: '50px',
          position: 'absolute',
          top: '20%',
          left: '25%',
          right: '25%',
          margin: '0 auto',
          border: '1px solid #ccc',
          'z-index': '10',
          'text-align': 'center'
        }).prependTo(this.doc.body).find('a').bind('click', function() {
          return chrome.extension.sendRequest({
            method: 'auth'
          });
        });
      }
      if ($("#emailReminder", this.doc).length) return false;
      lastrow = $("tr.ee", this.doc);
      container = $(template);
      container.insertBefore(lastrow);
      menu = void 0;
      container.find('#emailReminder-send').bind('click', function(evt) {
        if (!$(evt.currentTarget).closest('.J_M').length) {
          menu = $(menu_template).appendTo($(evt.currentTarget)).delegate("a.menu-anchor", "click", function(evt) {
            $('#conditional-caption', _this.doc).html(evt.currentTarget.innerHTML);
            wait_for_sent = evt.currentTarget.dataset.time;
            $('.J-M', _this.doc).remove();
            return false;
          }).delegate("a.show_notification", "click", function(evt) {
            return _this.showNotification();
          });
        } else {
          $(evt.currentTarget).find('.J_M').remove();
        }
        return evt.stopPropagation();
      });
      return $(this.doc).bind('click', function(evt) {
        if (menu && !$(evt.currentTarget, _this.doc).closest('.J-M').length) {
          menu.remove();
          return menu = void 0;
        }
      });
    };

    Reminder.prototype.stripEmailAddresses = function(email) {
      var match, rEMAIL;
      rEMAIL = /[a-zA-Z0-9\._+-]+@[a-zA-Z0-9\.-]+\.[a-z\.A-Z]+/g;
      match = rEMAIL.match(email);
      return match.join(" ");
    };

    Reminder.prototype.extractEmailAddressesFromField = function(b) {
      var a;
      a = $("[name=" + b + "]", this.doc).first().val();
      return a != null ? a : {
        "None": this.stripEmailAddresses(a)
      };
    };

    Reminder.prototype.getEmailIdentifier = function() {
      var url;
      url = window.location.toString();
      return url.substring(url.lastIndexOf('/') + 1);
    };

    Reminder.prototype.handleEvent = function(thread_id) {
      var data;
      data = {
        method: 'addEvent',
        thread_id: thread_id,
        time: wait_for_sent
      };
      return chrome.extension.sendRequest(data);
    };

    Reminder.prototype.hideNotification = function(thread_id) {
      chrome.extension.sendRequest({
        method: 'removeEvent',
        thread_id: thread_id
      });
      return $(".b8.UC", this.doc).css({
        visibility: "hidden"
      });
    };

    Reminder.prototype.showNotification = function(thread_id) {
      var notification;
      var _this = this;
      notification = $(".b8.UC .vh", this.doc).html("Email reminder for <span class='ag ca mail' role='link'>mail</span>&nbsp;<span class='ag ca close' role='link'>close</span>").delegate('span.mail', 'click', function(evt) {
        window.location.hash = "#inbox/" + thread_id;
        return _this.hideNotification(thread_id);
      }).delegate('span.close', 'click', function(evt) {
        return _this.hideNotification(thread_id);
      });
      return $(".b8.UC", this.doc).css({
        visibility: "visible"
      });
    };

    Reminder.prototype.detectDocument = function() {
      var b;
      b = document.getElementById("canvas_frame");
      if (!b) return;
      this.doc = b.contentWindow || b.contentDocument;
      if (this.doc.document) return this.doc = this.doc.document;
    };

    return Reminder;

  })();

  new Reminder();

  this.init = function() {
    return console.warn("loaded");
  };

}).call(this);
