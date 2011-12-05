(function() {
  var EVENT_FEED_URL, handleError;

  EVENT_FEED_URL = "https://www.google.com/calendar/feeds/default/private/full";

  handleError = function(e) {
    var errorStatus, statusText;
    if (e instanceof Error) {
      console.error('Error at line ' + e.lineNumber + ' in ' + e.fileName + '\n' + 'Message: ' + e.message);
      if (e.cause) {
        errorStatus = e.cause.status;
        statusText = e.cause.statusText;
        return console.error('Root cause: HTTP error ' + errorStatus + ' with status text of: ' + statusText);
      }
    } else {
      return console.error(e.toString());
    }
  };

  google.setOnLoadCallback(function() {
    var myService, token;
    google.gdata.client.init(handleError);
    token = google.accounts.user.checkLogin(EVENT_FEED_URL);
    console.log('token:', token);
    myService = new google.gdata.calendar.CalendarService("Email Reminder");
    if (google.accounts.user.checkLogin(EVENT_FEED_URL)) {
      return true;
    } else {
      return console.log(token);
    }
  });

}).call(this);
