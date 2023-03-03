class Timeago {
    constructor(MOMENT) {
        return time => MOMENT.unix(time).fromNow();
    }
}

class Duration {
    constructor(MOMENT) {
        return time => MOMENT.unix(time).from(MOMENT.unix(0),1);
    }
}

class Durationformat {
    constructor(MOMENT) {
        return function(time) {
            if (time < 0)
                return ""
            const d = MOMENT.duration(time * 1000);
            const m = MOMENT.utc(d.asMilliseconds());
            const days = Math.floor(d.asDays());
            if (days) {
                let plural = "";
                if (days > 1) {
                    plural = "s";
                }
                return `${days} day${plural} ` + m.format('H:mm:ss');
            }
            if (d.hours()) {
                return m.format('H:mm:ss');
            }
            if (d.minutes()) {
                return m.format('m:ss');
            } else {
                return m.format('s') + " s";
            }
        };
    }
}

class Dateformat {
    constructor(MOMENT) {
        return (time, f) => MOMENT.unix(time).format(f);
    }
}

class DateformatWithLessThanDayNoDate {
    constructor(MOMENT) {
        return function (time, f) {
            if (time < 0)
                return ""
            const timeMoment = MOMENT.utc(time * 1000); 
            const todayMidnight = MOMENT.utc().startOf('day');
            if(todayMidnight.isAfter(timeMoment))
                return MOMENT.unix(time).format(f);
            
            let newFormat = f.replace(' DD.MM.YY', '');
            return MOMENT.unix(time).format(newFormat);
        };
    }
}


angular.module('common')
.filter('timeago', ['MOMENT', Timeago])
.filter('duration', ['MOMENT', Duration])
.filter('durationformat', ['MOMENT', Durationformat])
.filter('dateformat', ['MOMENT', Dateformat])
.filter('dateformatwithlessthandaynodate', ['MOMENT', DateformatWithLessThanDayNoDate]);
