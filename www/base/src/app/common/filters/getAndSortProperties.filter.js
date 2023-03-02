class GetAndSortProperties {
    constructor() {
        const preferredSortingOrder = [
            'branch',
            'got_revision',
            'owner',
            'buildType',
            'obfuscate',
            'profiler',
            'appStore',
            'testFlight',
        ];
        
        return function(object) {
            if ((object == null)) {
                return object;
            }
            
            let result = {};

            for (let i = 0; i < preferredSortingOrder.length; i++) {
                if (object[preferredSortingOrder[i]])
                    result[preferredSortingOrder[i]] = object[preferredSortingOrder[i]]; 
            }
            
            return result;
        };
    }
}


angular.module('common')
.filter('getAndSortProperties', [GetAndSortProperties]);
