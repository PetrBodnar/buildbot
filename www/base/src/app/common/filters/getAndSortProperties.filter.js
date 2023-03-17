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
            'reason':'Reason',
            'android_hashes':'',
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
                        if(key === 'android_hashes') {
                            result["Hash 1"] = [value[0].split(' ')[0], ''];
                            result["Hash 2"] = [value[0].split(' ')[1], ''];
                        }
                        else {
                            if(key === "owner")
                                value[0] = value[0].split('@')[0];
                            result[preferredSortingOrder[key]] = value;
                        }
                    }
                }
            }
            
            return result;
        };
    }
}


angular.module('common')
.filter('getAndSortProperties', [GetAndSortProperties]);
