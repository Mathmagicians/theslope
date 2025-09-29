"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeasonFactory = void 0;
var date_1 = require("../../../app/utils/date");
var useSeasonValidation_1 = require("../../../app/composables/useSeasonValidation");
var testHelpers_1 = require("../testHelpers");
var test_1 = require("@playwright/test");
var householdFactory_1 = require("./householdFactory");
var _a = (0, useSeasonValidation_1.useSeasonValidation)(), serializeSeason = _a.serializeSeason, deserializeSeason = _a.deserializeSeason;
var salt = testHelpers_1.default.salt, headers = testHelpers_1.default.headers;
var ADMIN_TEAM_ENDPOINT = '/api/admin/team';
var SeasonFactory = /** @class */ (function () {
    function SeasonFactory() {
    }
    var _b;
    _b = SeasonFactory;
    SeasonFactory.today = new Date();
    SeasonFactory.ninetyDaysLater = new Date(_b.today.getTime() + 90 * 24 * 60 * 60 * 1000);
    SeasonFactory.defaultSeasonData = {
        shortName: 'TestSeason',
        seasonDates: {
            start: (0, date_1.formatDate)(_b.today),
            end: (0, date_1.formatDate)(_b.ninetyDaysLater)
        },
        isActive: false,
        cookingDays: {
            mandag: true,
            tirsdag: true,
            onsdag: true,
            torsdag: true,
            fredag: false,
            loerdag: false,
            soendag: false
        },
        holidays: [],
        ticketIsCancellableDaysBefore: 10,
        diningModeIsEditableMinutesBefore: 90
    };
    // TODO static factory method with updated season with an extra holiday
    SeasonFactory.defaultSeason = function (testSalt) {
        if (testSalt === void 0) { testSalt = Date.now().toString(); }
        var saltedSeason = __assign(__assign({}, _b.defaultSeasonData), { shortName: salt(_b.defaultSeasonData.shortName, testSalt) });
        return {
            season: saltedSeason,
            serializedSeason: serializeSeason(saltedSeason)
        };
    };
    SeasonFactory.createSeason = function (context_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1], args_1, true), void 0, function (context, aSeason, expectedStatus) {
            var requestData, response, status, responseBody;
            if (aSeason === void 0) { aSeason = _b.defaultSeason().season; }
            if (expectedStatus === void 0) { expectedStatus = 201; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0:
                        requestData = expectedStatus === 201
                            ? serializeSeason(aSeason)
                            : aSeason;
                        return [4 /*yield*/, context.request.put('/api/admin/season', {
                                headers: headers,
                                data: requestData
                            })];
                    case 1:
                        response = _a.sent();
                        status = response.status();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _a.sent();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        // Only check for ID on successful creation
                        if (expectedStatus === 201) {
                            (0, test_1.expect)(responseBody.id, 'Response should contain the new season ID').toBeDefined();
                        }
                        return [2 /*return*/, responseBody];
                }
            });
        });
    };
    SeasonFactory.deleteSeason = function (context_1, id_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, id_1], args_1, true), void 0, function (context, id, expectedStatus) {
            var deleteResponse, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 200; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context.request.delete("/api/admin/season/".concat(id))];
                    case 1:
                        deleteResponse = _a.sent();
                        (0, test_1.expect)(deleteResponse.status()).toBe(expectedStatus);
                        if (!(expectedStatus === 200)) return [3 /*break*/, 3];
                        return [4 /*yield*/, deleteResponse.json()];
                    case 2:
                        responseBody = _a.sent();
                        (0, test_1.expect)(responseBody).toBeDefined();
                        return [2 /*return*/, responseBody];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    SeasonFactory.createSeasonWithTeams = function (context_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1], args_1, true), void 0, function (context, seasonData, teamCount) {
            var season, teams;
            var _this = _b;
            if (seasonData === void 0) { seasonData = _b.defaultSeason().season; }
            if (teamCount === void 0) { teamCount = 2; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createSeason(context, seasonData)];
                    case 1:
                        season = _a.sent();
                        return [4 /*yield*/, Promis.all(Array(teamCount).fill(0).map(function () { return _this.createCookingTeamForSeason(context, newSeason.id); }))];
                    case 2:
                        teams = _a.sent();
                        return [2 /*return*/, { season: season, teams: teams }];
                }
            });
        });
    };
    SeasonFactory.createDinnerEventsForSeason = function (context_1, seasonId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, seasonId_1], args_1, true), void 0, function (context, seasonId, eventCount) {
            if (eventCount === void 0) { eventCount = 3; }
            return __generator(_b, function (_a) {
                throw new Error('createDinnerEventsForSeason: Not implemented - mock method');
            });
        });
    };
    /**
     * Create season with teams and dinner events (for comprehensive test scenarios)
     */
    SeasonFactory.createSeasonWithTeamsAndDinners = function (context_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1], args_1, true), void 0, function (context, options) {
            if (options === void 0) { options = {}; }
            return __generator(_b, function (_a) {
                throw new Error('createSeasonWithTeamsAndDinners: Not implemented - mock method');
            });
        });
    };
    // === COOKING TEAM METHODS ===
    SeasonFactory.createCookingTeamForSeason = function (context_1, seasonId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, seasonId_1], args_1, true), void 0, function (context, seasonId, teamName, expectedStatus) {
            var teamData, response, status, responseBody;
            if (teamName === void 0) { teamName = 'TestTeam'; }
            if (expectedStatus === void 0) { expectedStatus = 201; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0:
                        teamData = {
                            name: salt(teamName),
                            seasonId: seasonId
                        };
                        return [4 /*yield*/, context.request.put(ADMIN_TEAM_ENDPOINT, {
                                headers: headers,
                                data: teamData
                            })];
                    case 1:
                        response = _a.sent();
                        status = response.status();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _a.sent();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (expectedStatus === 201) {
                            (0, test_1.expect)(responseBody.id, 'Response should contain the new team ID').toBeDefined();
                            (0, test_1.expect)(responseBody.seasonId).toBe(seasonId);
                        }
                        return [2 /*return*/, responseBody];
                }
            });
        });
    };
    SeasonFactory.createCookingTeamWithMembersForSeason = function (context_1, seasonId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, seasonId_1], args_1, true), void 0, function (context, seasonId, teamName, memberCount) {
            var team, roles, household, memberAssignments, i, memberData, member, teamWithMembers;
            if (teamName === void 0) { teamName = 'TestTeam'; }
            if (memberCount === void 0) { memberCount = 3; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createCookingTeamForSeason(context, seasonId, teamName = 'TestTeam')];
                    case 1:
                        team = _a.sent();
                        roles = ['CHEF', 'COOK', 'JUNIOR_HELPER'];
                        household = householdFactory_1.HouseholdFactory.createHouseholdWithInhabitants(context, undefined, memberCount);
                        memberAssignments = Array(memberCount).fill(0).map(function (_, i) {
                            return ({
                                seasonId: seasonId,
                                name: salt("TestMember-".concat(i)),
                                role: roles[i % roles.length],
                                tea: tea
                            });
                        });
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < memberCount)) return [3 /*break*/, 5];
                        memberData = {
                            seasonId: seasonId,
                            name: salt("TestMember".concat(i + 1)),
                            role: i === 0 ? 'CHEF' : (i === 1 ? 'COOK' : 'JUNIOR_HELPER') // Vary roles
                        };
                        return [4 /*yield*/, this.assignMemberToTeam(context, team.id, memberData)];
                    case 3:
                        member = _a.sent();
                        members.push(member);
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [4 /*yield*/, this.getCookingTeamById(context, team.id)];
                    case 6:
                        teamWithMembers = _a.sent();
                        return [2 /*return*/, teamWithMembers];
                }
            });
        });
    };
    SeasonFactory.getCookingTeamById = function (context_1, teamId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, teamId_1], args_1, true), void 0, function (context, teamId, expectedStatus) {
            var response, status, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 200; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context.request.get("".concat(ADMIN_TEAM_ENDPOINT, "/").concat(teamId))];
                    case 1:
                        response = _a.sent();
                        status = response.status();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (!(expectedStatus === 200)) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _a.sent();
                        (0, test_1.expect)(responseBody.id).toBe(teamId);
                        return [2 /*return*/, responseBody];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    SeasonFactory.getCookingTeamAssignment = function (context_1, assignmentId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, assignmentId_1], args_1, true), void 0, function (context, assignmentId, expectedStatus) {
            var response, status, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 200; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context.request.get("/api/admin/team/assignment/".concat(assignmentId))];
                    case 1:
                        response = _a.sent();
                        status = response.status();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (!(expectedStatus === 200)) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _a.sent();
                        (0, test_1.expect)(responseBody.id).toBe(assignmentId);
                        return [2 /*return*/, responseBody];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    SeasonFactory.assignMemberToTeam = function (context_1, teamId_1, inhabitantId_1, role_1) {
        var args_1 = [];
        for (var _i = 4; _i < arguments.length; _i++) {
            args_1[_i - 4] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, teamId_1, inhabitantId_1, role_1], args_1, true), void 0, function (context, teamId, inhabitantId, role, expectedStatus) {
            var teamAssignmentData, response, status;
            if (expectedStatus === void 0) { expectedStatus = 201; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0:
                        teamAssignmentData = {
                            teamId: teamId,
                            inhabitantId: inhabitantId,
                            role: role
                        };
                        return [4 /*yield*/, context.request.put("".concat(ADMIN_TEAM_ENDPOINT, "/assignments"), {
                                headers: headers,
                                data: memberData
                            })];
                    case 1:
                        response = _a.sent();
                        status = response.status();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (!(expectedStatus === 201)) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    SeasonFactory.removeMemberFromTeam = function (context_1, teamId_1, memberAssignmentIds_1) {
        var args_1 = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args_1[_i - 3] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, teamId_1, memberAssignmentIds_1], args_1, true), void 0, function (context, teamId, memberAssignmentIds, expectedStatus) {
            if (expectedStatus === void 0) { expectedStatus = 200; }
            return __generator(_b, function (_a) {
                throw new Error('assignMembersToTeam: Not implemented - mock method');
            });
        });
    };
    /**
     * Associate team with dinner events (weak relation) for 1a, 1b test scenarios
     */
    SeasonFactory.assignTeamToDinnerEvents = function (context, teamId, eventIds) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(_b, function (_a) {
            throw new Error('assignTeamToDinnerEvents: Not implemented - mock method');
        });
    }); };
    /**
     * Delete cooking team (for 1a test scenarios)
     */
    SeasonFactory.deleteCookingTeam = function (context_1, teamId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, teamId_1], args_1, true), void 0, function (context, teamId, expectedStatus) {
            var response, status;
            if (expectedStatus === void 0) { expectedStatus = 200; }
            return __generator(_b, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context.request.delete("".concat(ADMIN_TEAM_ENDPOINT, "/").concat(teamId))];
                    case 1:
                        response = _a.sent();
                        status = response.status();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (!(expectedStatus === 200)) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    SeasonFactory.getCookingTeamsForSeason = function (context, seasonId) { return __awaiter(void 0, void 0, void 0, function () {
        var response, responseBody;
        return __generator(_b, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, context.request.get("".concat(ADMIN_TEAM_ENDPOINT, "?seasonId=").concat(seasonId))];
                case 1:
                    response = _a.sent();
                    (0, test_1.expect)(response.status()).toBe(200);
                    return [4 /*yield*/, response.json()];
                case 2:
                    responseBody = _a.sent();
                    (0, test_1.expect)(Array.isArray(responseBody)).toBe(true);
                    return [2 /*return*/, responseBody];
            }
        });
    }); };
    SeasonFactory.getAllCookingTeams = function (context) { return __awaiter(void 0, void 0, void 0, function () {
        var response, responseBody;
        return __generator(_b, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, context.request.get(ADMIN_TEAM_ENDPOINT)];
                case 1:
                    response = _a.sent();
                    (0, test_1.expect)(response.status()).toBe(200);
                    return [4 /*yield*/, response.json()];
                case 2:
                    responseBody = _a.sent();
                    (0, test_1.expect)(Array.isArray(responseBody)).toBe(true);
                    return [2 /*return*/, responseBody];
            }
        });
    }); };
    return SeasonFactory;
}());
exports.SeasonFactory = SeasonFactory;
