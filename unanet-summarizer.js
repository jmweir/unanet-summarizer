window.summarizeUnanetTime = (function() {
    // see: http://krasimirtsonev.com/blog/article/Javascript-template-engine-in-just-20-line
    var Template = function(html) {
        var re = /<%([^%>]+)?%>/g,
            reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g,
            code = 'var r=[];\n',
            cursor = 0,
            match;

        var add = function(line, js) {
            js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n')
               : (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
            return add;
        };

        while(match = re.exec(html)) {
            add(html.slice(cursor, match.index))(match[1], true);
            cursor = match.index + match[0].length;
        }

        add(html.substr(cursor, html.length - cursor));
        code += 'return r.join("");';

        return new Function(code.replace(/[\r\t\n]/g, ''));
    };

    const SUMMARIZER_ROOT = 'https://excellalabs.github.io/unanet-summarizer/';
    const SUMMARIZER_STYLESHEET = SUMMARIZER_ROOT + '/summarizer-style.css';

    const CONTAINER_ID = 'unanet-summary';
    const STYLESHEET_ID = 'unanet-style';
    const CSS_CLASS = 'unanet-summary';

    const CONTAINER_TEMPLATE = Template(
      '<h2>Unanet Time Summary</h2>' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th colspan="<% this.hoursByProjectType.length %>">Project Types</th>' +
            '<th colspan="3">Totals</th>' +
          '</tr>' +
          '<tr>' +
            '<% for (var i in this.hoursByProjectType) { %>' +
              '<th><% this.hoursByProjectType[i].projectType %></th>' +
            '<% } %>' +
            '<th>+ Hours</th>' +
            '<th>Non + Hours</th>' +
            '<th>Grand Total</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          '<tr>' +
            '<% for (var i in this.hoursByProjectType) { %>' +
              '<td><% this.hoursByProjectType[i].totalHours %></td>' +
            '<% } %>' +
            '<td><% this.totalPlusHoursResult %></td>' +
            '<td><% this.totalNonPlusHoursResult %></td>' +
            '<td><% this.totalHoursResult %></td>' +
          '</tr>' +
        '</tbody>' +
      '</table>'
    );

    var isReadOnlyTimesheet = function() {
        // if there are no inputs, the timesheet is readonly
        return document.querySelectorAll('input').length === 0;
    };

    var toArray = function(nodeList) {
        return [].slice.call(nodeList);        
    };

    var obtainTimeEntryRows = function() { 
        var readOnly = isReadOnlyTimesheet();

        console.log('readOnly: ', readOnly);

        var rows = toArray(readOnly ?
          document.querySelectorAll("table.timesheet > tbody:first-of-type > tr")
          : document.querySelectorAll("#timesheet > tbody:first-of-type > tr")
        );

        return rows
          .map(function(timesheetRow) {
            var projectType;
            var timeValue;
        
            if (readOnly) {
                projectType = timesheetRow.querySelector(':nth-child(4)').textContent || "";
                timeValue = parseFloat(timesheetRow.querySelector(':last-child').textContent) || parseFloat(0.0);
            } else {
                projectType = timesheetRow.querySelector("td.project-type > select > option:checked").text;  
                timeValue = parseFloat(timesheetRow.querySelector('td.total > input').getAttribute('value')) || parseFloat(0.0); 
            }
        
            return (!projectType || projectType === '') ? null : { projectType: projectType, timeValue: timeValue };
          })
          .filter(function(timesheetRow) {
            return timesheetRow !== null;
          });
    };

    var totalHoursReduceFunction = function(acc, obj) {
        return acc + obj.timeValue;
    };

    var totalHoursByProjectType = function(acc, obj){ 
        if(!acc.find(function(element){return element.projectType === obj.projectType;})){
            acc.push({projectType: obj.projectType, totalHours: 0.0});
        }
        
        var entry = acc.find(function(element){return element.projectType === obj.projectType;});
        entry.totalHours += obj.timeValue;
        
        return acc;
    };

    var totalPlusHours = function(acc, obj){
        if (obj.projectType.includes("+")){
            acc = acc + obj.timeValue;
        }
        return acc;
    };

    var totalNonPlusHours = function(acc, obj){
        if (!obj.projectType.includes("+")){
            acc = acc + obj.timeValue;
        }
        return acc;
    };

    var createContainer = function() {
        var container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.className = CSS_CLASS;
        return document.body.insertBefore(container, document.body.firstChild);
    };

    var createStylesheetRef = function() {
        var link = document.createElement('link');
        link.id = STYLESHEET_ID;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = SUMMARIZER_STYLESHEET;
        return document.head.appendChild(link);
    };

    // This function returns an object with a reducer function (a way of reducing an array of hours which we'll pass later)
    // and the starting state of the accumulators that those reducers will use. 
    var getReducers = function() {
        return {
            hoursByProjectType: { fn: totalHoursByProjectType, init: [] },
            totalPlusHoursResult: { fn: totalPlusHours, init: 0.0 },
            totalNonPlusHoursResult: { fn: totalNonPlusHours, init: 0.0 },
            totalHoursResult: { fn: totalHoursReduceFunction, init: 0.0 }
        };
    };
    
    // Execution
    return function() {
        // inject stylesheet
        if (!document.getElementById(STYLESHEET_ID)) {
            createStylesheetRef();
        }

        var timeEntries = obtainTimeEntryRows();        
        var reducers = getReducers();

        // Takes each reducer function name and function, calls reduce using that function,
        // and sets the result on an object that we reference in our document generation.
        var properties = Object.keys(reducers).reduce(function(acc, property) {
            var config = reducers[property];
            acc[property] = timeEntries.reduce(config.fn, config.init);
            return acc;
        }, {});
        
        var container = document.getElementById(CONTAINER_ID) || createContainer();
        container.innerHTML = CONTAINER_TEMPLATE.apply(properties);
    };
})();
