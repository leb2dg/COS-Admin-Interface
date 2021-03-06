'use strict';

var $osf = require('js/osfHelpers');
var ko = require('knockout');
var $ = require('jquery');

var drafts;

ko.bindingHandlers.enterkey = {
    init: function (element, valueAccessor, allBindings, viewModel) {
        var callback = valueAccessor();
        $(element).keypress(function (event) {
            var keyCode = (event.which ? event.which : event.keyCode);
            if (keyCode === 13) {
                callback.call(viewModel);
                return false;
            }
            return true;
        });
    }
};

var Assignee = function(reviewers) {
    var self = this;
    self.edit = ko.observable(false);

    if (reviewers[0] !== 'none') {
        reviewers.unshift('none'); 
    }
    
    self.reviewers = ko.observableArray(reviewers);
    self.assignee = ko.observable('none');
};

Assignee.prototype.enlargeIcon = function(data, event) {
    var icon = event.currentTarget;
    $(icon).addClass("fa-2x");
};

Assignee.prototype.shrinkIcon = function(data, event) {
    var icon = event.currentTarget;
    $(icon).removeClass("fa-2x");
};
Assignee.prototype.editItem = function() {
    var self = this;
    self.assignee.edit(!self.editing);
    self.editing(!self.editing);
    
};

var ProofOfPub = function() {
    var self = this;
    self.edit = ko.observable(false);
    self.proofOfPub = ko.observable('Published Article Not Yet Submitted');
    self.proofOfPubList = ko.observableArray(['Published Article Not Yet Submitted', 'Published Article Submitted', 'Published Article Under Review', 'Published Article Approved', 'Published Article Rejected']);
};

ProofOfPub.prototype.enlargeIcon = function(data, event) {
    var icon = event.currentTarget;
    $(icon).addClass("fa-2x");
};

ProofOfPub.prototype.shrinkIcon = function(data, event) {
    var icon = event.currentTarget;
    $(icon).removeClass("fa-2x");
};
ProofOfPub.prototype.editItem = function() {
    var self = this;
    self.proofOfPub.edit(!self.editing);
    self.editing(!self.editing);
};

var PaymentSent = function() {
    var self = this;
    self.edit = ko.observable(false);
    self.paymentSent = ko.observable('no');
};

PaymentSent.prototype.enlargeIcon = function(data, event) {
    var icon = event.currentTarget;
    $(icon).addClass("fa-2x");
};

PaymentSent.prototype.shrinkIcon = function(data, event) {
    var icon = event.currentTarget;
    $(icon).removeClass("fa-2x");
};
PaymentSent.prototype.editItem = function() {
    var self = this;
    self.editing(true);
    self.paymentSent.edit(true);
};

PaymentSent.prototype.stopEditing = function() {
    var self = this;
    self.editing(false);
    self.paymentSent.edit(false);
};

var Notes = function() {
    var self = this;
    self.edit = ko.observable(false);
    self.notes = ko.observable('none');
};

Notes.prototype.enlargeIcon = function(data, event) {
    var icon = event.currentTarget;
    $(icon).addClass("fa-2x");
};

Notes.prototype.shrinkIcon = function(data, event) {
    var icon = event.currentTarget;
    $(icon).removeClass("fa-2x");
};
Notes.prototype.editItem = function() {
    var self = this;
    self.editing(true);
    self.notes.edit(true);
};

Notes.prototype.stopEditing = function() {
    var self = this;
    self.editing(false);
    self.notes.edit(false);
};

var Row = function(params, permission, reviewers) {
    var self = this;

    self.params = params;
    self.viewingDraft = ko.observable(false);
    if (permission === "false") {
        permission = false;
    } else {
        permission = true;
    }
    self.adminPermission = ko.observable(permission);

    self.editing = ko.observable(false);

    self.title = params.registration_metadata.q01.value || "no title";
    self.fullname = params.initiator.fullname;
    self.username = params.initiator.emails[0].address;
    self.initiated = self.formatTime(params.initiated);
    self.updated = self.formatTime(params.updated);
    // TODO[lauren]: change to computed function based on flags
    self.status = ko.observable(params.approval.state);
    
    //variables for editing items in row
    self.proofOfPub = new ProofOfPub();
    self.paymentSent = new PaymentSent();
    self.notes = new Notes();
    self.assignee = new Assignee(reviewers); 
};


Row.prototype.highlightRow = function(data, event) {  
    var row = event.currentTarget;
    $(row).css("background","#E0EBF3"); 
};

Row.prototype.unhighlightRow = function(data, event) {
    var row = event.currentTarget;
    $(row).css("background",""); 
};

Row.prototype.formatTime = function(time) {
    var parsedTime = time.split(".");
    return parsedTime[0]; 
};

Row.prototype.goToDraft = function(data, event) {
    var self = this;
    if (self.editing() === false) {
        self.viewingDraft(true);
        document.location.href = '/prereg-form/' + self.params.pk + '/';
    }
};

var AdminView = function(adminSelector, user, reviewers) {
    var self = this;

    self.adminSelector = adminSelector;
    self.user = user;
    self.reviewers = reviewers;

    self.getDrafts = $.getJSON.bind(null, "/get-drafts/");

    self.drafts = ko.observableArray();
    self.loading = ko.observable(true);

    self.sortedDrafts = ko.pureComputed(function() {
        var row = self.sortBy();
        return self.drafts().sort(function (left, right) { 
            var a = deep_value(left, row).toLowerCase();
            var b = deep_value(right, row).toLowerCase();
            return a == b ? 0 : 
                (a < b ? -1 : 1); 
        });
    }, this);

    self.sortBy = ko.observable('title');

    self.init();
}

AdminView.prototype.init = function() {
    var self = this;

    // '#prereg-row'
    $osf.applyBindings(self, self.adminSelector);

    var getDrafts = self.getDrafts();

    // create new view model for each row
    getDrafts.then(function(response) {
        self.drafts(
            $.map(response.drafts, function(draft){
                return new Row(draft, self.user.admin, self.reviewers);
            })
        );
    });

    $.when(getDrafts).then(function() {
        self.loading(false);
    });
}

AdminView.prototype.setSort = function(data, event) {
    var self = this;
    self.sortBy(event.target.id);
};

$(document).ready(function() {
    var user = prereg_user;
    var reviewers = prereg_reviewers;
    var adminView = new AdminView('#prereg-row', user, reviewers);
});

var deep_value = function(obj, path){
    for (var i=0, path=path.split('.'), len=path.length; i<len; i++){
        if (obj === undefined) {
            return "No title";
        }
        if (path[i].indexOf('(') === -1) {
            obj = obj[path[i]];
        } else {
            var func = path[i].split('(');
            obj = obj[func[0]]();
        }
        
    };
    return obj;
};
