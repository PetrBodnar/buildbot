/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class resultsService {
    constructor($log, RESULTS, RESULTS_TEXT) {

        let _isBundlesBuild = function(build) {
            return build && build.buildProperties && build.buildProperties.buildType &&
                build.buildProperties.buildType.length > 0 && build.buildProperties.buildType[0] === 'Bundles';
        };

        let _getBuildPropertiesString = function (build) {
            let result = "";

            if(!build || !build.buildProperties || !build.buildProperties.buildType)
                return result;

            const bundles = _isBundlesBuild(build);
            if(!bundles)
            {
                if(build.buildProperties.buildType[0] === "Development")
                    result += "DEV: ";
                if(build.buildProperties.buildType[0] === "Release")
                    result += "RELEASE: ";
                if(build.buildProperties.androidStore && build.buildProperties.androidStore.length > 0)
                {
                    let index = result.indexOf(':');
                    if(index >= 0)
                    {
                        result = result.slice(0, index) + ' ' + build.buildProperties.androidStore[0] + result.slice(index);
                    }
                }
                if(build.buildProperties.useObb && build.buildProperties.useObb[0])
                    result += 'OBB, ';
                if(build.buildProperties.appStore && build.buildProperties.appStore[0])
                    result += 'AppStore, ';
                if(build.buildProperties.testFlight && build.buildProperties.testFlight[0])
                    result += 'TestFlight, ';
                if(build.buildProperties.profiler && build.buildProperties.profiler[0])
                    result += 'Profiler, ';
            }
            else {
                result += "BUNDLES";
            }

            result = result.trim();
            if(result.endsWith(':') || result.endsWith(','))
                result = result.substring(0, result.length - 1);

            return result;
        };

        return {
            results: RESULTS,
            resultsTexts: RESULTS_TEXT,

            getBuildPropertiesString(build) {
                return _getBuildPropertiesString(build);
            },
            
            isBundlesBuild(build) {
                return _isBundlesBuild(build);
            },
            
            results2class(build_or_step, pulse) {
                let ret = "results_UNKNOWN";
                if (build_or_step != null) {
                    if(build_or_step.complete === true && _isBundlesBuild(build_or_step))
                        return "results_BUNDLES";
                    
                    if ((build_or_step.results != null) && _.has(RESULTS_TEXT, build_or_step.results)) {
                        ret = `results_${RESULTS_TEXT[build_or_step.results]}`;
                    }
                    if ((build_or_step.complete === false)  && (build_or_step.started_at > 0)) {
                        ret = 'results_PENDING';
                        if (pulse != null) {
                            ret += ` ${pulse}`;
                        }
                    }
                }
                return ret;
            },

            results2text(build_or_step) {
                let ret = "...";
                if (build_or_step != null) {
                    if ((build_or_step.results != null) && _.has(RESULTS_TEXT, build_or_step.results)) {
                        ret = RESULTS_TEXT[build_or_step.results];
                    }
                }
                return ret;
            }
        };
    }
}


angular.module('common')
.factory('resultsService', ['$log', 'RESULTS', 'RESULTS_TEXT', resultsService]);
