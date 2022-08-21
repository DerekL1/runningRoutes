/**to-do:
 * when finding intersections, if diff starting and ending loc, make denser search area around both those instead of center
 */
var map, recentPin1, recentPin2, recentLine, infobox;

/**
 * Generates the map.
 */
getMap = () => {
    map = new Microsoft.Maps.Map(document.getElementById('map'), {showLocateMeButton : false, zoom : 13});
    //generating the auto-suggest boxes
    Microsoft.Maps.loadModule('Microsoft.Maps.AutoSuggest', function () {
        var manager = new Microsoft.Maps.AutosuggestManager({ map : map });
        manager.attachAutosuggest(document.getElementById('searchBox'), document.getElementById('searchBoxContainer'), selectedSuggestion1);
    });
    Microsoft.Maps.loadModule('Microsoft.Maps.AutoSuggest', function () {
        var manager = new Microsoft.Maps.AutosuggestManager({ map : map });
        manager.attachAutosuggest(document.getElementById('endDest'), document.getElementById('searchBoxContainer'), selectedSuggestion2);
    });
}

/**
 * Generates suggestions when typing in an address for the starting locaction.
 */
selectedSuggestion1 = (result) => {
    //remove previously selected suggestion from the map
    if (typeof recentPin1 !== 'undefined') {
        map.entities.remove(recentPin1);
    }
    infobox = new Microsoft.Maps.Infobox(map.getCenter(), {visible: false});
    infobox.setMap(map);
    var pin = new Microsoft.Maps.Pushpin(result.location, {color: 'red'});
    //set new pin as the recent suggestion to remove if a new suggestion is inputted
    recentPin1 = pin;
    //show pin and center map over it
    map.entities.push(pin);
    map.setView({center : result.location, zoom : 13});
}

/**
 * Generates suggestions when typing in an address for the ending location.
 */
selectedSuggestion2 = (result) => {
    //remove previously selected suggestion from the map
    if (typeof recentPin2 !== 'undefined') {
        map.entities.remove(recentPin2);
    }
    infobox = new Microsoft.Maps.Infobox(map.getCenter(), {visible : false});
    infobox.setMap(map);
    var pin = new Microsoft.Maps.Pushpin(result.location, {color : 'blue'});
    //set new pin as the recent suggestion to remove if a new suggestion is inputted
    recentPin2 = pin;
    //show pin and center map over it
    map.entities.push(pin);
    map.setView({center : result.location, zoom : 13});
}

/**
 * Grabs the location of the user.
 */
getUserLocation = () => {
    //get location of user
    navigator.geolocation.getCurrentPosition(function (position) {
        if (typeof recentPin1 !== 'undefined') {
            map.entities.remove(recentPin1);
        }
        infobox = new Microsoft.Maps.Infobox(map.getCenter(), {visible : false});
        infobox.setMap(map);
        //grab location from the position of user
        var loc = new Microsoft.Maps.Location(position.coords.latitude, position.coords.longitude);
        var pin = new Microsoft.Maps.Pushpin(loc, {color : 'red'});
        recentPin1 = pin;
        map.entities.push(pin);
        map.setView({center : loc, zoom : 13});
        coords = String(position.coords.latitude) + ", " + String(position.coords.longitude);
        //grab an address from the coordinates
        var url = `https://dev.virtualearth.net/REST/v1/Locations/${coords}?includeEntityTypes=&o=json&key=Am8ryQPYHCOfmbeh9Uk6tulI8N1xFN-Ab9DRLdmRbDtaJ8SFj1U00pU5LW9xzzac`;
        var name;
        fetch(url)
        .then(res => res.json())
        .then((out) => {
            for (const tempList of out["resourceSets"][0]["resources"]) {
                if ((typeof name) == "undefined") {
                    if ("confidence" in tempList) {
                        if (tempList["confidence"] == "Low") {
                            if ("name" in tempList) {
                                name = tempList["name"];
                            }
                        }
                    }
                }
            }
            if ((typeof name) == "undefined") {
                document.getElementById("searchBox").value = coords;
            }
            else {
                document.getElementById("searchBox").value = name;
            }
        })
        .catch(err => { 
            par.innerHTML = "Please enter in a valid address";
            throw err 
        });
    });
}

/**
 * Takes the starting and ending locations and the distance to generate route(s) that fit the parameters.
 */
findRoute = () => {
    //grab all fields
    var par = document.getElementById("routeResult");
    var distance = document.getElementById("distance").value;
    var loc = document.getElementById("searchBox").value;
    var endLoc = document.getElementById("endDest").value;
    var unit = document.getElementById("unit").value;
    if (loc === "") {
        par.innerHTML = "Please enter in a valid address.";
        return;
    }
    if (endLoc === "") {
        endLoc=loc;
        if (typeof recentPin2 !== 'undefined') {
            map.entities.remove(recentPin2);
        }
        recentPin2 = undefined;
        map.setView({center : recentPin1.getLocation(), zoom : 13});
    }
    if (unit === "mi") {
        distance = distance * 1.60934;
    }
    if (distance === 0) {
        par.innerHTML = "Please enter in a valid distance.";
        return;
    }
    //create requests for starting and end location
    const fetchReq1 = fetch(`https://dev.virtualearth.net/REST/v1/Locations/${loc}?includeEntityTypes=&o=json&key=Am8ryQPYHCOfmbeh9Uk6tulI8N1xFN-Ab9DRLdmRbDtaJ8SFj1U00pU5LW9xzzac`)
    .then(res => res.json());
    const fetchReq2 = fetch(`https://dev.virtualearth.net/REST/v1/Locations/${endLoc}?includeEntityTypes=&o=json&key=Am8ryQPYHCOfmbeh9Uk6tulI8N1xFN-Ab9DRLdmRbDtaJ8SFj1U00pU5LW9xzzac`)
    .then(res => res.json());
    //get coords of starting/end locs
    const allFetches = Promise.all([fetchReq1, fetchReq2]);
    allFetches.then((out) => {
        //get lat/long/coords of starting location
        var lat, long, coords;
        for (const tempList of out[0]["resourceSets"][0]["resources"]) {
            if ((typeof lat) == "undefined") {
                if ("confidence" in tempList) {
                    if (tempList["confidence"] != "Low") {
                        if ("point" in tempList) {
                            if ("coordinates" in tempList["point"]) {
                                lat = tempList["point"]["coordinates"][0];
                                long = tempList["point"]["coordinates"][1];
                            }
                        }
                    }
                }
            }
        }
        coords = lat + ", " + long;
        if ((typeof lat) == "undefined") {
            par.innerHTML = "Please enter in a valid address.";
            return;
        }
        //get lat/long/coords of ending location
        var lat2, long2, coords2;
        for (const tempList of out[1]["resourceSets"][0]["resources"]) {
            if ((typeof lat2) == "undefined") {
                if ("confidence" in tempList) {
                    if (tempList["confidence"] != "Low") {
                        if ("point" in tempList) {
                            if ("coordinates" in tempList["point"]) {
                                lat2 = tempList["point"]["coordinates"][0];
                                long2 = tempList["point"]["coordinates"][1];
                            }
                        }
                    }
                }
            }
        }
        coords2 = lat2 + ", " + long2;
        if ((typeof lat2) == "undefined") {
            par.innerHTML = "Please enter in a valid address.";
            return;
        }
        //find a route that matches the parameters
        console.log(`coords1: ${coords}\ncoords2: ${coords2}`);
        /*making a bounding box: if only given starting loc, make a bounding box of half the given distance or if given starting
        and ending loc, make a bounding box around the middle of the two points, with the proper given distance*/
        var centerLat = lat;
        var centerLong = long;
        if (coords === coords2) {
            distance = distance / 2;
        }
        else {
            centerLat = (lat + lat2) / 2;
            centerLong = (long + long2) / 2;
        }
        var latBound = (distance / 111.045) * 0.75; //converting from distance (in km) to latitude degrees
        var longBound = (distance / 87.87018) * 0.75; //converting from distance (in km) to longitude degrees
        var coordList = [];
        //difference variables scale with size of bounding box to get all intersections while not making too many unnecessary calls to the API
        var difference = distance / 850;
        var numBound1 = 4;
        var numBound2 = 5;
        console.log(distance);
        if (distance < 1) {
            console.log("<1");
            difference = distance / 800;
            numBound1 = 3;
            numBound2 = 5;
        }
        else if (distance < 3) {
            console.log("<3");
            difference = distance / 800;
            numBound1 = 3;
            numBound2 = 5;
        }
        else if (distance < 5) {
            console.log("<5");
            difference = distance / 850;
            numBound1 = 5;
            numBound2 = 4;
        }
        else {
            console.log("else");
            difference = distance / 866;
            numBound1 = 5;
            numBound2 = 4;
        }
        var difference2 = difference / numBound1;
        for (var latDiff = 0; latDiff < latBound; latDiff += difference2) {
            for (var longDiff = 0; longDiff < longBound; longDiff += difference2) {
                if (distEstimate(centerLat, centerLong, centerLat + latDiff, centerLong + longDiff) < distance) {
                    coordList.push([centerLat + latDiff, centerLong + longDiff]);
                    coordList.push([centerLat + latDiff, centerLong - longDiff]);
                    coordList.push([centerLat - latDiff, centerLong + longDiff]);
                    coordList.push([centerLat - latDiff, centerLong - longDiff]);
                }
                if (latDiff > latBound / numBound2) {
                    difference2 = difference;
                }
            }
        }
        if (coords === coords2) {
            distance = distance * 2;
        }
        else {
            coordList.push([lat, long]);
            coordList.push([lat2, long2]);
        }
        //collect all unique nearest intersections to each of the coordinates, and gather all relevant data
        var tryFetches = [];
        var changeMail = 0;
        console.log(coordList.length);
        for (const tryCoords of coordList) {
            const fetchReq = fetch(`http://api.geonames.org/findNearestIntersectionJSON?lat=${tryCoords[0]}&lng=${tryCoords[1]}&username=runningroutes${changeMail}`)
            .then(res => res.json());
            tryFetches.push(fetchReq);
            //gets past account limit for api
            changeMail++;
            if (changeMail === 26) {
                changeMail = 0;
            }
        }
        const allTryFetches = Promise.all(tryFetches);
        allTryFetches.then((out) => {
            var roadIntersections = {}; //{road: [intersection1, intersection2, etc]}
            var intersectionList = {}; //{intersection: [lat, long]}
            var neighborList = {}; //{intersection: [intersection1, intersection2, etc]}
            var roadList = [];
            //find the closest intersections to the start and end locs
            var num1 = -1;
            var num2 = -1;
            var closestStart = "";
            var closestEnd = "";
            if (coords === coords2) {
                num1 = 0;
            }
            else {
                num1 = out.length - 2;
                num2 = out.length - 1;
            }
            var tempcount = 0;
            //parse through all the intersections and fill in the roadIntersections, intersectionList, and neighborList
            for (const jsonParse of out) {
                if ("intersection" in jsonParse) {
                    var street1 = jsonParse["intersection"]["street1"];
                    var street2 = jsonParse["intersection"]["street2"];
                    var intersection = [street1, street2].sort();
                    var intersectionName = intersection[0] + ", " + intersection[1];
                    //find closest intersections for start/end locs
                    if (tempcount === num1) {
                        closestStart = intersectionName;
                    }
                    if (tempcount === num2) {
                        closestEnd = intersectionName;
                    }
                    //fill in roadIntersections, intersectionList, and neighborList
                    if (intersectionName in intersectionList === false) {
                        intersectionList[intersectionName] = [jsonParse["intersection"]["lat"], jsonParse["intersection"]["lng"]];
                        neighborList[intersectionName] = [];
                        if (street1 in roadIntersections) {
                            roadIntersections[street1].push(intersectionName);
                        }
                        else {
                            roadList.push(street1);
                            roadIntersections[street1] = [intersectionName];
                        }
                        if (street2 in roadIntersections) {
                            roadIntersections[street2].push(intersectionName);
                        }
                        else {
                            roadList.push(street2);
                            roadIntersections[street2] = [intersectionName];
                        }
                    }
                }
                else {
                    //logic for if the closest intersection for starting + ending loc fails
                    if (tempcount === num1 && num2 === -1) {
                        num1 += 1;
                    }
                    else if (tempcount === num1) {
                        var md = 1000000;
                        for (const tempInter of intersectionList) {
                            a = distEstimate(lat, long, intersectionList[intersection][0], intersectionList[intersection][1]);
                            if (a < md) {
                                md = a;
                                closestStart = tempInter;
                            }
                        }
                    }
                    else if (tempcount === num2) {
                        var md = 1000000;
                        for (const tempInter of intersectionList) {
                            a = distEstimate(lat2, long2, intersectionList[intersection][0], intersectionList[intersection][1]);
                            if (a < md) {
                                md = a;
                                closestEnd = tempInter;
                            }
                        }
                    }
                }
                tempcount++;
            }
            if (closestEnd === "") {
                closestEnd = closestStart;
            }
            /*find neighbors by finding a route for each road that makes it the shortest
            find all possible permutations of intersections on each road, in such a way that reverse order doesn't matter*/
            var iterRecord = [];
            var permutationRecord = [];
            var bigRoads = [];
            for (var road of roadList) {
                if (roadIntersections[road].length < 9) {
                    var num = 0;
                    var permutationList = [];
                    var seenPermutations = [];
                    for (var permutation of permute(roadIntersections[road])) {
                        if (permutation.length === 2) {
                            var check = true;
                            if (seenPermutations.length > 0) {
                                check = false;
                            }
                            for (const test of seenPermutations) {
                                for (var i = 0; i < test.length; i++) {
                                    if (test[i] != permutation[i]) {
                                        check = true;
                                    }
                                }
                            }
                            if (check) {
                                seenPermutations.push(permutation.reverse());
                                permutationList.push(permutation);
                                num = 1;
                            }
                        }
                        if (permutation.length > 2) {
                            var check = true;
                            for (const test of seenPermutations) {
                                if (seenPermutations.length > 0) {
                                    check = false;
                                }
                                for (var i = 0; i < test.length; i++) {
                                    if (test[i] != permutation[i]) {
                                        check = true;
                                    }
                                }
                                if (check === false) {
                                    break;
                                }
                            }
                            if (check) {
                                seenPermutations.push(permutation.reverse());
                                permutationList.push(permutation);
                                num += 1;
                            }
                        }
                    }
                    if (num != 0) {
                        permutationRecord.push(permutationList);
                        iterRecord.push(num);
                    }
                }
                else {
                    bigRoads.push(road);
                }
            }
            //find the combination that is most likely to be in order, going off lowest total distance when traveling the route
            var baseNum = 0;
            for (const iterNum of iterRecord) {
                //set neighbors for each intersection
                if (iterNum === 1) {
                    neighborList[permutationRecord[baseNum][0][0]].push(permutationRecord[baseNum][0][1]);
                    neighborList[permutationRecord[baseNum][0][1]].push(permutationRecord[baseNum][0][0]);
                }
                else {
                    var properOrder = [];
                    var minLength = 10000000000;
                    for (var i = 0; i < iterNum; i++) {
                        newVal = permutationRecord[baseNum][i];
                        totalDist = 0;
                        for (var j = 0; j < newVal.length - 1; j++) {
                            totalDist += distEstimate(intersectionList[newVal[j]][0], intersectionList[newVal[j]][1], intersectionList[newVal[j + 1]][0], intersectionList[newVal[j + 1]][1]);
                        }
                        if (totalDist < minLength) {
                            minLength = totalDist;
                            properOrder = newVal;
                        }
                    }
                    neighborList[properOrder[0]].push(properOrder[1]);
                    for (var i = 1; i < properOrder.length - 1; i++) {
                        neighborList[properOrder[i]].push(properOrder[i - 1]);
                        neighborList[properOrder[i]].push(properOrder[i + 1]);
                    }
                    neighborList[properOrder[properOrder.length - 1]].push(properOrder[properOrder.length - 2]);
                }
                baseNum++;
            }
            //deal with the roads that were too big to find the best combination, instead make some assumptions about neighbors
            for (const bigRoad of bigRoads) {
                //find an assumed end of the road (the point that has the longest net distance to all the other points)
                var maxDist = 0;
                var endIntersection = "";
                for (const tempIntersection of roadIntersections[bigRoad]) {
                    var tempDist = 0;
                    for (const tempIntersection2 of roadIntersections[bigRoad]) {
                        if (tempIntersection != tempIntersection2) {
                            tempDist += distEstimate(intersectionList[tempIntersection][0], intersectionList[tempIntersection][1], intersectionList[tempIntersection2][0], intersectionList[tempIntersection2][1]);
                        }
                    }
                    if (tempDist > maxDist) {
                        maxDist = tempDist;
                        endIntersection = tempIntersection;
                    }
                }
                /*find the closest intersection on the road that hasn't been seen yet
                start from the assumed end found before, then work your way to the other end of the road
                could fail for curved roads in weird shapes*/
                var seenIntersections = new Set();
                seenIntersections.add(endIntersection);
                var i = 1;
                while (i < roadIntersections[bigRoad].length) {
                    var minDist = 10000000;
                    var nearestIntersection = "";
                    for (const tempIntersection of roadIntersections[bigRoad]) {
                        if (seenIntersections.has(tempIntersection) === false) {
                            var tempDist = distEstimate(intersectionList[endIntersection][0], intersectionList[endIntersection][1], intersectionList[tempIntersection][0], intersectionList[tempIntersection][1]);
                            if (tempDist < minDist) {
                                minDist = tempDist;
                                nearestIntersection = tempIntersection;
                            }
                        }
                    }
                    seenIntersections.add(nearestIntersection);
                    neighborList[endIntersection].push(nearestIntersection);
                    neighborList[nearestIntersection].push(endIntersection);
                    endIntersection = nearestIntersection;
                    i = seenIntersections.size;
                }
            }
            console.log(intersectionList);
            console.log(neighborList);
            //replace starting and ending locs with their nearest intersections and change the distance accordingly
            var distDiff = distEstimate(lat, long, intersectionList[closestStart][0], intersectionList[closestStart][1]) + distEstimate(lat2, long2, intersectionList[closestEnd][0], intersectionList[closestEnd][1]);
            //set the closestEnd as the nearest neighbor of closestStart if they are equal to each other, decrease the distance accordingly
            if (closestStart === closestEnd) {
                var minDist = 10000000;
                var closest = "";
                for (const nbr of neighborList[closestStart]) {
                    var tempDist = distEstimate(intersectionList[closestEnd][0], intersectionList[closestEnd][1], intersectionList[nbr][0], intersectionList[nbr][1]);
                    if (tempDist < minDist) {
                        minDist = tempDist;
                        closest = nbr;
                    }
                }
                closestEnd = closest;
                distDiff += minDist;
            }
            distance -= distDiff;
            seenSet = new Set();
            //generate list of links of intersections
            linkList = [];
            for (const int in neighborList) {
                for (const nbr of neighborList[int]) {
                    if (!seenSet.has(nbr)) {
                        linkList.push([int, nbr]);
                    }
                }
                seenSet.add(int);
            }
            //find routes
            var routes = driver(closestStart, closestEnd, linkList, intersectionList, distance);
            console.log(routes);
            //estimate which route is best
            var bestRoute = [];
            var bestDist = 10000000;
            var rawDist = 0;
            for (var i = 0; i < routes.length; i++) {
                var tempDist = 0;
                var route = routes[i]
                for (var j = 0; j < route.length - 1; j++) {
                    inter1 = intersectionList[route[j]];
                    inter2 = intersectionList[route[j + 1]];
                    tempDist += distEstimate(inter1[0], inter1[1], inter2[0], inter2[1]);
                }
                if (Math.abs(distance - tempDist) < bestDist) {
                    bestDist = Math.abs(distance - tempDist);
                    rawDist = tempDist;
                    bestRoute = route;
                }
            }
            console.log(bestRoute)
            //add one last link if starting and ending loc are same
            if (coords === coords2) {
                bestRoute.push(closestStart);
            }
            //draw the route to the map
            drawRoute(lat, long, lat2, long2, bestRoute, "purple", intersectionList);
            //get the estimated distance of the route
            var finalDist = rawDist+distDiff;
            if (unit === "mi") {
                finalDist = finalDist / 1.609;
            }
            //get the url of the google maps route
            //if the total length of the path is >33, cut down on the route by trying to reduce intersections 
            //in between two others on the same road, so that the route reaches a length of 25
            if (bestRoute.length > 23) {
                var numList = [];
                var tempArr = bestRoute[0].split(", ");
                var prevRoad1 = tempArr[0];
                var prevRoad2 = tempArr[1];
                tempArr = bestRoute[1].split(", ");
                var currRoad1 = tempArr[0];
                var currRoad2 = tempArr[1];
                var nextRoad1, nextRoad2;
                for (var i = 2; i < bestRoute.length; i++) {
                    tempArr = bestRoute[i].split(", ");
                    nextRoad1 = tempArr[0];
                    nextRoad2 = tempArr[1];
                    if ((currRoad1 === prevRoad1 || currRoad1 === prevRoad2) && (currRoad1 === nextRoad1 || currRoad1 == nextRoad2)) {
                        numList.push(i - 1);
                    }
                    else if ((currRoad2 === prevRoad1 || currRoad2 === prevRoad2) && (currRoad2 === nextRoad1 || currRoad2 == nextRoad2)) {
                        numList.push(i - 1);
                    }
                    prevRoad1 = currRoad1;
                    prevRoad2 = currRoad2;
                    currRoad1 = nextRoad1;
                    currRoad2 = nextRoad2;
                }
                var newBestRoute = [];
                var begNum = 0;
                for (var i = 0; i < bestRoute.length - 23; i++) {
                    newBestRoute = newBestRoute.concat(bestRoute.slice(begNum, numList[i]));
                    begNum = numList[i] + 1;
                }
                newBestRoute = newBestRoute.concat(bestRoute.slice(begNum));
                bestRoute = newBestRoute;
            }
            console.log(bestRoute)
            //if the route is still not short enough, then alert the user as such.
            if (bestRoute.length > 23) {
                par.innerHTML = `Route found! Estimated distance: ${Math.round((finalDist + Number.EPSILON) * 100) / 100} ${unit}<br>The route was too large to properly generate a Google Maps route.`;
            }
            else {
                var url = `https://www.google.com/maps/dir/${lat},${long}`;
                for(const inter of bestRoute) {
                    url += `/${intersectionList[inter][0]},${intersectionList[inter][1]}`;
                }
                url += `/${lat2},${long2}`;
                console.log(url)
                //print the distance and url
                par.innerHTML = `Route found! Estimated distance: ${Math.round((finalDist + Number.EPSILON) * 100) / 100} ${unit}<br><a href="${url}" target="_blank">Google Maps link</a>`;
            }
            //print the text route
            var s = `Route (using intersections):<br><br>${loc}<br>`;
            for (const int of bestRoute) {
                s += `${int}<br>`;
            }
            s += `${endLoc}`
            document.getElementById("rawRoute").innerHTML = s;
            //loads a map of the route; however it only works for smaller routes with fewer waypoints
            // var s = "";
            // var url = "https://dev.virtualearth.net/REST/v1/Imagery/Map/Road/Routes?";
            // var url2 = "https://dev.virtualearth.net/REST/V1/Routes/Walking?";
            // var wp = 0;
            // for (var i = 0; i < bestRoute.length; i++) {
            //     if (wp === 0 || i === bestRoute.length - 1) {
            //         url += `wp.${i}=${intersectionList[bestRoute[i]]}&`;
            //         url2 += `wp.${i}=${intersectionList[bestRoute[i]]}&`;
            //     }
            //     else {
            //         url += `vwp.${i}=${intersectionList[bestRoute[i]]}&`;
            //         url2 += `vwp.${i}=${intersectionList[bestRoute[i]]}&`;
            //     }
            //     if (wp === 10) {
            //         wp = -1;
            //     }
            //     wp++;
            // }
            // url += "key=Am8ryQPYHCOfmbeh9Uk6tulI8N1xFN-Ab9DRLdmRbDtaJ8SFj1U00pU5LW9xzzac";
            // url2 += "&key=Am8ryQPYHCOfmbeh9Uk6tulI8N1xFN-Ab9DRLdmRbDtaJ8SFj1U00pU5LW9xzzac";
            // console.log(url)
            // console.log(url2)
            // s += `<img src=${url}\><br>`;
            // document.getElementById("routeMap").innerHTML = s;
        })
        .catch(err => {
            par.innerHTML = "Unable to find a route.";
            throw err;
        });
    })
    .catch(err => { 
        par.innerHTML = "Unable to find a route.";
        throw err;
    });
}

/**
 * Draws a route given a path and color on the map.
 * 
 * @param lat starting latitude
 * @param long starting longitude
 * @param lat2 ending latitude
 * @param long2 ending longitude
 * @param route the path in between start and end
 * @param color 
 * @param intersectionList maps addresses to coordinates
 */
drawRoute = (lat, long, lat2, long2, route, color, intersectionList) => {
    if (typeof recentLine !== 'undefined') {
        map.entities.remove(recentLine);
    }
    //make a list of coordinates given a route
    var coords = [new Microsoft.Maps.Location(lat, long)];
    for(const loc of route){
        coords.push(new Microsoft.Maps.Location(intersectionList[loc][0], intersectionList[loc][1]));
    }
    coords.push(new Microsoft.Maps.Location(lat2, long2));
    console.log(coords);
    //create route
    var line = new Microsoft.Maps.Polyline(coords, {
        strokeColor: color,
        strokeThickness: 3,
    });
    //set new recent line to clear if new route wants to be found
    recentLine = line;
    //add route to map
    map.entities.push(line);
}

/**
 * Estimates the distance between two coordinate pairs (in km).
 * 
 * @param lat1 
 * @param long1
 * @param lat2 
 * @param long2
 */
distEstimate = (lat1, long1, lat2, long2) => {
    r = 6371; //in km, radius of earth
    y1 = lat1 * Math.PI / 180.0;
    x1 = long1 * Math.PI / 180.0;
    y2 = lat2 * Math.PI / 180.0;
    x2 = long2 * Math.PI / 180.0;
    return Math.acos(Math.sin(y1) * Math.sin(y2) + Math.cos(y1) * Math.cos(y2) * Math.cos(x2 - x1)) * r; //law of cosines
}

/**
 * Generates all the possible permutations of a list.
 * 
 * @param permutation
 */
function* permute(permutation) {
    var length = permutation.length,
        c = Array(length).fill(0),
        i = 1, k, p;
    yield permutation.slice();
    while (i < length) {
        if (c[i] < i) {
            k = i % 2 && c[i];
            p = permutation[i];
            permutation[i] = permutation[k];
            permutation[k] = p;
            ++c[i];
            i = 1;
            yield permutation.slice();
        } 
        else {
            c[i] = 0;
            ++i;
        }
    }
}  

/**
 * PathFinder 
 *          builds a graph using an adjacency map; 
 *          then finds all paths from a node to another using DFS
 * 
 * Author: Derek Li
 * Date: July 15, 2022
 * Email: derekl52738@gmail.com
 */
class PathFinder {
    #adjacencyMap = new Map(); // stores a graph

    /**
     * Adds a bi-directional link.
     * 
     * @param a nodeId
     * @param b nodeId
     */
    #addLink = (a, b) => {
        if (!this.adjacencyMap.has(a))
            this.adjacencyMap.set(a, new Set());
        if (!this.adjacencyMap.has(b))
            this.adjacencyMap.set(b, new Set());
        this.adjacencyMap.get(a).add(b);
        this.adjacencyMap.get(b).add(a);
    }

    /**
     * Creates a PathNode structure.
     * 
     * @param nodeId current nodeId
     * @param parent Node
     */
    #createPathNode = (nodeId, parent) => {
        return {
            parent,
            nodeId
        }
    }

    /**
     * Checks if a node (Id) is already on the path to the current node.
     * 
     * @param current current node
     * @param nextNodeId for a node to be checked
     */
    #isOnThePath = (current, nextNodeId) => {
        if (current.nodeId === nextNodeId)
            return true;
        while (current.parent !== null) {
            current = current.parent;
            if (current.nodeId === nextNodeId)
                return true;
        }
        return false;
    }
    /**
     * Checks if the current path has a chance at fulfilling the distance requirements.
     * 
     * @param current current node
     * @param intersectionList maps intersection names to coordinates
     * @param distance distance requirement
     */
    #distanceCheck = (current, intersectionList, distance) => {
        var tempDist = 0;
        var lat = intersectionList[current.nodeId][0];
        var long = intersectionList[current.nodeId][1];
        var lat2, long2 = 0;
        while (current.parent !== null) {
            lat2 = intersectionList[current.parent.nodeId][0];
            long2 = intersectionList[current.parent.nodeId][1];
            tempDist += distEstimate(lat, long, lat2, long2);
            lat = lat2;
            long = long2;
            current = current.parent;
        }
        return (tempDist / distance < 1);
    }

    /**
     * Getter to access internal adjacency map.
     */ 
    get adjacencyMap() {
        return this.#adjacencyMap;
    }

    /**
     * Logs a path to the console.
     * 
     * @param {PathNode} node a leaf node representing a path to the start node
     */
    printPath = (node) => {
        if (node !== null && node.nodeId !== null) {
            let path = [node.nodeId];
            let msg = `Path >>> ${node.nodeId}`;
            while (node.parent !== null) {
                node = node.parent;
                msg += ` -> ${node.nodeId}`;
                path.push(node.nodeId);
            }
            console.log(msg);
            return path;
        }
        else {
            console.log("Path is empty!");
            return [];
        }
    }

    /**
     * Add input links to the graph.
     * 
     * @param inputLinks
     */
    buildGraph = (inputLinks) => {
        inputLinks.forEach(
            (link) => {
                this.#addLink(link[0], link[1]);
            }
        );
    }

    /**
     * Find and return a number of paths (specified by the pathLimit).
     * 
     * @param start starting nodeId
     * @param end ending nodeId
     * @param intersectionList maps intersection names to coordinates
     * @param distance distance requirement
     */
    findAllPathsByDFS = (start, end, intersectionList, distance) => {
        const pathLimit = 20; //sets limit on how many paths the dfs finds
        let nodeStack = [];
        let paths = [];
        let n = this.#createPathNode(start, null);
        var escape = false;
        nodeStack.push(n);
        while (nodeStack.length > 0) {
            let parentNode = nodeStack.pop();
            let v = parentNode.nodeId; 
            let neighbors = this.adjacencyMap.get(v);
            if (neighbors !== null) {
                if (this.#distanceCheck(parentNode, intersectionList, distance)) {
                    neighbors.forEach((neighbor) => {
                        if (!this.#isOnThePath(parentNode, neighbor)) {
                            let n = this.#createPathNode(neighbor, parentNode);
                            nodeStack.push(n);
                            if (neighbor === end) {
                                nodeStack.pop(); //end node does not stay in the stack
                                paths.push(n); //record a path
                                if (paths.length === pathLimit) {
                                    escape = true;
                                }
                                return;
                            }
                        }
                    });
                }
            }
            if (escape) {
                return paths;
            }
        }
        return paths;
    }
}

/**
 * Driver
 * 
 * @param start starting intersection
 * @param end ending intersection
 * @param inputLinks list of links between intersections
 * @param intersectionList maps intersection names to coordinates
 * @param distance distance requirement
 */
driver = (start, end, inputLinks, intersectionList, distance) => {
    const pf = new PathFinder();
    //build a graph
    pf.buildGraph(inputLinks);
    //find all paths
    let paths = pf.findAllPathsByDFS(start, end, intersectionList, distance);
    //print out all paths
    var allPaths = [];
    while (paths.length > 0) {
        allPaths.push(pf.printPath(paths.pop()).reverse());
    }
    return allPaths;
}
