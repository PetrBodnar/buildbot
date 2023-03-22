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
            
            if (object._filteredAndSortedFields == null) { object._filteredAndSortedFields = {}; }
            for (let key in preferredSortingOrder) {
                // check if the property/key is defined in the object itself, not in parent
                if (preferredSortingOrder.hasOwnProperty(key)) {
                    let value = object[key];
                    if (value) {
                        if(key === 'android_hashes' && value[0] !== '') {
                            try {
                                let currentHash1 = object._filteredAndSortedFields["Hash 1"];
                                let newHash1 = value[0].split(' ')[0];
                                if(!currentHash1 || currentHash1[0] !== newHash1)
                                    object._filteredAndSortedFields["Hash 1"] = [newHash1, ''];

                                let currentHash2 = object._filteredAndSortedFields["Hash 2"];
                                let newHash2 = value[0].split(' ')[1];
                                if(!currentHash2 || currentHash2[0] !== newHash2)
                                    object._filteredAndSortedFields["Hash 2"] = [newHash2, ''];
                            }
                            catch (e) {
                            }
                        }
                        else {
                            if(key === "owner") {
                                let currentOwner = object._filteredAndSortedFields[preferredSortingOrder['owner']];
                                let newOwner = value[0].split('@')[0];
                                if(!currentOwner || currentOwner[0] !== newOwner)
                                    object._filteredAndSortedFields[preferredSortingOrder['owner']] = [newOwner, value[1]];
                            }
                            else {
                                object._filteredAndSortedFields[preferredSortingOrder[key]] = value;
                            }
                        }
                    }
                }
            }
            
            return  object._filteredAndSortedFields;
        };
    }
}


angular.module('common')
.filter('getAndSortProperties', [GetAndSortProperties]);
