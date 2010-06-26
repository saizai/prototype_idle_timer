/*
 Prototype Idle Timer v 0.1
 
 Ideas taken from http://github.com/paulirish/jquery-idletimer
 (c) 2010 Sai Emrys
 Released into the public domain @ http://github.com/saizai/prototype-idletimer
 Do whatever you want with this - though if you're cool you'll share your improvements. 
 
 API:
 
 $(document).idleTimer();		// create timer on document - 30s by default
 $('my_form').idleTimer();		// ditto, but only count events within my_form
 $(document).idleTimer();		// has no effect - 30s document timer already registered
 $(document).idleTimer(60000);	// create timer on document, 60s
 $(document).idleTimer(100000);	// create timer on document, 100s
 
 Events fired:
 idle:timeout - when a timer elapses
 idle:return - when activity resumes after a timer has elapsed
 
 Event data is stored in the event.memo object:
 timer - the registered timer (in ms) related to the event
 idleTime - the exact time (in ms) the user was idle before they returned
 
 Example sequence of events:
 00s all 3 idleTimers above started; user active in my_form
 10s user moves activity to some other area of the page
 15s user ceases activity
 40s my_form  idle:timeout timer: 30000
 75s document idle:timeout timer: 60000
 45s document idle:timeout timer: 30000  
 90s user resumes activity elsewhere in page
 90s document idle:return timer: 30000, idleTime: 75001 // note: this order is NOT guaranteed
 90s document idle:return timer: 60000, idleTime: 75001 // 
 95s user resumes activity in my_form
 95s my_form idle:return timer: 30000, idleTime: 85000
 
 $(document).idleTime(); 				// return time the user has been idle, in ms
 										// this only works AFTER idleTimer() has been invoked on the element
 $(document).removeIdleTimer(60000);	// remove just the 60s timer
 $(document).removeIdleTimer();			// remove just the 30s (default) timer
 $(document).removeIdleTimers();		// remove all remaining timers on document (i.e. the 100s above)
 										// note that the 30s timer on my_form is still active
 
 Example event observers:
 $(document).observe('idle:timeout', function(event) {
	alert('yet another idling out');
	if (event.memo.timer == 60000)
		alert('just hit 60s idle');
 });
 
 $('my_form').observe('idle:timeout', function(event) {
	if(event.memo.timer == 30000)
		alert('form is now idle (even though the document might not be)');
 });
 
 // This (like idle:timeout) will get fired once for *each* timer.
 // To avoid repeating action, make sure to check event.memo.timer
 $(document).observe('idle:return', function(event) {
 	// same as above plus
	if(event.memo.idleTime > 86400000)
		alert('back after a whole day!');
 });
 
*/ 

var idleEvents = $w('mousemove keydown DOMMouseScroll mousewheel mousedown');
var idleDefaultTimeout = 30000;

var activityHandler = function(event) {
	// ensure that element is back to normal before events fire
	element = this;
	idleTime = (+new Date) - element.lastActive;
	element.lastActive = (+new Date);
	timedOutCopy = element.timedOut.clone();
	element.timedOut = $A();
	
	// fire!
	timedOutCopy.each(function(e){
		element.fire('idle:return', {idleTime: idleTime, timer: e});
	});
	
	// and refresh the timeout
	element.timeOutHandlers.each(function(pair) {
		timeout = pair.key;
		old_handler = pair.value;
		clearTimeout(old_handler);
		element.timeOutHandlers.set(timeout, 
			setTimeout(timeOutHandler.bind(element, timeout), timeout - (+new Date) + element.lastActive)
		);
	});
};

var timeOutHandler = function(timeout) {
	element = this;
	if (element.timedOut.indexOf(timeout) == -1 ) {
		element.timedOut.push(timeout);
		element.fire('idle:timeout', {timer: timeout});
	}
};

// Object.extend(Element.Methods, {
Element.addMethods({
	idleTime: function(element){
		if (!(element = $(element))) return;
		return (+new Date) - element.lastActive;
	},
	
	idleTimer: function(element, timeout) {
		if (!(element = $(element))) return;
		timeout = timeout || idleDefaultTimeout;
		element.timers = element.timers || $A();
		
		// don't double add
		if (element.timers.indexOf(timeout) == -1) {
			element.timers.push(timeout);
			element.timeOutHandlers = element.timeOutHandlers || $H();
			
			element.lastActive = element.lastActive || (+new Date);
			element.timedOut = element.timedOut || $A();
			// only one set of event observers per element
			if (element.timers.size() == 1) {
				idleEvents.each(function(e){
					element.observe(e, activityHandler);
				});
			}
			
			element.timeOutHandlers.set(timeout, 
				setTimeout(timeOutHandler.bind(element, timeout), timeout - (+new Date) + element.lastActive)
			);
		}
		return element;
	},
	
	removeIdleTimer: function(element, timeout) {
		if (!(element = $(element))) return;
		timeout = timeout || idleDefaultTimeout;
		element.timers = element.timers || $A();
		// don't remove unset timers
		if (element.timers.indexOf(timeout) != -1) {
			element.timers = element.timers.without(timeout);
			element.timedOut = element.timedOut.without(timeout);
			
			clearTimeout(element.timeOutHandlers.get(timeout));
			element.timeOutHandlers.unset(timeout);
			
			// remove observers iff all timers are gone
			if (element.timers.size() <= 0) {
				idleEvents.each(function(e){
					element.stopObserving(e, activityHandler)
				});
			}
		}
		return element;
	},
});

$(document).idleTime = Element.Methods.idleTime.curry($(document));
$(document).idleTimer = Element.Methods.idleTimer.curry($(document));
$(document).removeIdleTimer = Element.Methods.removeIdleTimer.curry($(document));
