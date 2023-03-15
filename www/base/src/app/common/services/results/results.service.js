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

        let _getBuildPropertiesString = function (build_or_br) {
            let result = "";

            if(!build_or_br || !build_or_br.buildProperties || !build_or_br.buildProperties.buildType)
                return result;

            const bundles = _isBundlesBuild(build_or_br);
            if(!bundles)
            {
                if(build_or_br.buildProperties.buildType[0] === "Development")
                    result += "DEV: ";
                if(build_or_br.buildProperties.buildType[0] === "Release")
                    result += "RELEASE: ";
                if(build_or_br.buildProperties.androidStore && build_or_br.buildProperties.androidStore.length > 0)
                {
                    let index = result.indexOf(':');
                    if(index >= 0)
                    {
                        result = result.slice(0, index) + ' ' + build_or_br.buildProperties.androidStore[0] + result.slice(index);
                    }
                }
                if(build_or_br.buildProperties.useObb && build_or_br.buildProperties.useObb[0])
                    result += 'OBB, ';
                if(build_or_br.buildProperties.appStore && build_or_br.buildProperties.appStore[0])
                    result += 'AppStore, ';
                if(build_or_br.buildProperties.testFlight && build_or_br.buildProperties.testFlight[0])
                    result += 'TestFlight, ';
                if(build_or_br.buildProperties.profiler && build_or_br.buildProperties.profiler[0])
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
            
            results2class(build_or_step_or_br, pulse) {
                let ret = "results_UNKNOWN";
                // buildrequest
                if(build_or_step_or_br && typeof build_or_step_or_br.submitted_at !== 'undefined')
                    return ret;
                
                if (build_or_step_or_br != null) {
                    if(build_or_step_or_br.complete === true && _isBundlesBuild(build_or_step_or_br))
                        return "results_BUNDLES";
                    
                    if ((build_or_step_or_br.results != null) && _.has(RESULTS_TEXT, build_or_step_or_br.results)) {
                        ret = `results_${RESULTS_TEXT[build_or_step_or_br.results]}`;
                    }
                    if ((build_or_step_or_br.complete === false)  && (build_or_step_or_br.started_at > 0)) {
                        ret = 'results_PENDING';
                        if (pulse != null) {
                            ret += ` ${pulse}`;
                        }
                    }
                }
                return ret;
            },

            results2text(build_or_step_or_br) {
                let ret = "...";
                if (build_or_step_or_br != null) {
                    if(typeof build_or_step_or_br.submitted_at !== 'undefined')
                        return "WAIT";
                    
                    if ((build_or_step_or_br.results != null) && _.has(RESULTS_TEXT, build_or_step_or_br.results)) {
                        ret = RESULTS_TEXT[build_or_step_or_br.results];
                    }
                }
                return ret;
            }
        };
    }
}


angular.module('common')
.factory('resultsService', ['$log', 'RESULTS', 'RESULTS_TEXT', resultsService]);
