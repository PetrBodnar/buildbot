class GetAndSortProperties {
    constructor() {
        const preferredSortingOrder = {
            'branch':'Branch',
            'got_revision':'Revision',
            'owner':'Owner',
            'buildType':'Type',
            'obfuscate':'Obfuscate',
            'profiler':'Profiler',
            'appStore':'AppStore',
            'testFlight':'TestFlight',
        };
        
        return function(object) {
            if ((object == null)) {
                return object;
            }
            
            let result = {};

            for (var key in preferredSortingOrder) {
                // check if the property/key is defined in the object itself, not in parent
                if (preferredSortingOrder.hasOwnProperty(key)) {
                    let value = object[key];
                    if (value) {
                        result[preferredSortingOrder[key]] = value;
                    }
                }
            }
            
            return result;
        };
    }
}


angular.module('common')
.filter('getAndSortProperties', [GetAndSortProperties]);
