"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var test_1 = require("@playwright/test");
var useCookingTeamValidation_1 = require("~/composables/useCookingTeamValidation");
var seasonFactory_1 = require("../../testDataFactories/seasonFactory");
var testHelpers_1 = require("~~/tests/e2e/testHelpers");
var _a = (0, useCookingTeamValidation_1.useCookingTeamValidation)(), validateCookingTeam = _a.validateCookingTeam, getTeamMemberCounts = _a.getTeamMemberCounts, getAllAssignmentIds = _a.getAllAssignmentIds;
var headers = testHelpers_1.default.headers, validatedBrowserContext = testHelpers_1.default.validatedBrowserContext;
var ADMIN_TEAM_ENDPOINT = '/api/admin/team';
// Variables to store IDs for cleanup
var testSeasonId;
var testUserIds = [];
var testDinnerIds = [];
var testTeamIds = [];
test_1.test.describe('Admin Teams API', function () {
    // Setup test season before all tests
    test_1.test.beforeAll(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, created;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                case 1:
                    context = _c.sent();
                    return [4 /*yield*/, seasonFactory_1.SeasonFactory.createSeason(context)
                        // Save ID for cleanup
                    ];
                case 2:
                    created = _c.sent();
                    // Save ID for cleanup
                    testSeasonId = created.id;
                    console.info("Created test season ".concat(created.shortName, " with ID ").concat(testSeasonId));
                    return [2 /*return*/];
            }
        });
    }); });
    test_1.test.describe('Admin Team Endpoints CRUD Operations', function () {
        (0, test_1.test)('PUT /api/admin/team should create a new team and GET should retrieve it', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, testTeam, retrievedTeam;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, testSeasonId)];
                    case 2:
                        testTeam = _c.sent();
                        (0, test_1.expect)(testTeam.id).toBeDefined();
                        // save for cleanup
                        testTeamIds.push(testTeam.id);
                        // Verify response structure
                        (0, test_1.expect)(testTeam.id).toBeGreaterThanOrEqual(0);
                        (0, test_1.expect)(testTeam.seasonId).toEqual(testSeasonId);
                        // Validate the response matches our schema
                        (0, test_1.expect)(function () { return validateCookingTeam(testTeam); }).not.toThrow();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.getCookingTeamById(context, testTeam.id)];
                    case 3:
                        retrievedTeam = _c.sent();
                        (0, test_1.expect)(retrievedTeam.id).toBe(testTeam.id);
                        (0, test_1.expect)(retrievedTeam.name).toBe(testTeam.name);
                        (0, test_1.expect)(retrievedTeam.seasonId).toBe(testTeam.seasonId);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('PUT /api/admin/team creates a team with team assignments and delete removes team and team assignments', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, testTeam, memberAssignmentIds, assignments, deleteResponse, assignmentsAfterDelete;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // DONT push it to cleanup, we will delete it in this test
                    ];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "Team-with-team-assignments", 2)];
                    case 2:
                        testTeam = _c.sent();
                        (0, test_1.expect)(testTeam.id).toBeDefined();
                        (0, test_1.expect)(testTeam.seasonId).toBe(testSeasonId);
                        (0, test_1.expect)(getTeamMemberCounts(testTeam).total).toEqual(2);
                        memberAssignmentIds = getAllAssignmentIds(testTeam);
                        (0, test_1.expect)(memberAssignmentIds.length).toBe(2);
                        return [4 /*yield*/, Promise.all(memberAssignmentIds.map(function (id) { return seasonFactory_1.SeasonFactory.getCookingTeamAssignment(context, id); }))];
                    case 3:
                        assignments = _c.sent();
                        (0, test_1.expect)(assignments.map(function (a) { return a.id; })).toEqual(memberAssignmentIds);
                        deleteResponse = seasonFactory_1.SeasonFactory.deleteCookingTeam(context, testTeam.id);
                        return [4 /*yield*/, Promise.all(memberAssignmentIds.map(function (id) { return seasonFactory_1.SeasonFactory.getCookingTeamAssignment(context, id, 404); }))];
                    case 4:
                        assignmentsAfterDelete = _c.sent();
                        (0, test_1.expect)(assignmentsAfterDelete.length).toBe(0);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('GET /api/admin/team should list all teams', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, testTeam, teams, foundTeam;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "List-All-Teams")];
                    case 2:
                        testTeam = _c.sent();
                        (0, test_1.expect)(testTeam.id).toBeDefined();
                        testTeamIds.push(testTeam.id);
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.getAllCookingTeams(context)];
                    case 3:
                        teams = _c.sent();
                        (0, test_1.expect)(Array.isArray(teams)).toBe(true);
                        foundTeam = teams.find(function (t) { return t.name.includes(testTeam.name) && t.id === testTeam.id; });
                        (0, test_1.expect)(foundTeam).toBeTruthy();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('GET /api/admin/team?seasonId=X should filter teams by season', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, testTeamName, team1, otherSeason, team2, filteredTeams, team1Found, team2Found;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Create a team for current season
                    ];
                    case 1:
                        context = _c.sent();
                        testTeamName = "Filter-By-Season-Team";
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, testSeasonId, testTeamName)
                            // Create teams for different seasons
                        ];
                    case 2:
                        team1 = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createSeason(context)];
                    case 3:
                        otherSeason = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, otherSeason.id, "Other-Season-Team")];
                    case 4:
                        team2 = _c.sent();
                        testTeamIds.push(team1.id, team2.id);
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.getCookingTeamsForSeason(context, testSeasonId)];
                    case 5:
                        filteredTeams = _c.sent();
                        team1Found = filteredTeams.find(function (t) { return t.id === team1.id; });
                        team2Found = filteredTeams.find(function (t) { return t.id === team2.id; });
                        (0, test_1.expect)(team1Found).toBeTruthy();
                        (0, test_1.expect)(team2Found).toBeFalsy(); // Should not appear in filtered results
                        // Cleanup other season
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.deleteSeason(context, otherSeason.id)];
                    case 6:
                        // Cleanup other season
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('GET /api/admin/team/[id] should get specific team details', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, createdTeam, teamDetails;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "team-details")];
                    case 2:
                        createdTeam = _c.sent();
                        (0, test_1.expect)(createdTeam.id).toBeDefined();
                        testTeamIds.push(createdTeam.id);
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.getCookingTeamById(context, createdTeam.id)];
                    case 3:
                        teamDetails = _c.sent();
                        (0, test_1.expect)(teamDetails.id).toBe(createdTeam.id);
                        (0, test_1.expect)(teamDetails.name).toBe(createdTeam.name);
                        (0, test_1.expect)(teamDetails.seasonId).toBe(testSeasonId);
                        // Should include member arrays
                        (0, test_1.expect)(teamDetails).toHaveProperty('chefs');
                        (0, test_1.expect)(teamDetails).toHaveProperty('cooks');
                        (0, test_1.expect)(teamDetails).toHaveProperty('juniorHelpers');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('POST /api/admin/team/[id] should update team', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, createdTeam, updatedData, updateResponse, updatedTeam;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "team-details")];
                    case 2:
                        createdTeam = _c.sent();
                        (0, test_1.expect)(createdTeam.id).toBeDefined();
                        testTeamIds.push(createdTeam.id);
                        updatedData = { name: "".concat(createdTeam.name, "-Updated") };
                        return [4 /*yield*/, context.request.post("".concat(ADMIN_TEAM_ENDPOINT, "/").concat(createdTeam.id), {
                                headers: headers,
                                data: updatedData
                            })];
                    case 3:
                        updateResponse = _c.sent();
                        (0, test_1.expect)(updateResponse.status()).toBe(200);
                        return [4 /*yield*/, updateResponse.json()];
                    case 4:
                        updatedTeam = _c.sent();
                        (0, test_1.expect)(updatedTeam.name).toBe(updatedData.name);
                        (0, test_1.expect)(updatedTeam.id).toBe(createdTeam.id);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('DELETE /api/admin/team/[id] should delete the cooking team, together with team assignments', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, createdTeam, teamMemberAssignments, assignmentsBeforeDelete;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-to-delete", 3)];
                    case 2:
                        createdTeam = _c.sent();
                        (0, test_1.expect)(createdTeam.id).toBeDefined();
                        // Do not add to cleanup, we are deleting it here
                        // Verify team and assignments exist
                        (0, test_1.expect)(getTeamMemberCounts(createdTeam).total).toBe(3);
                        teamMemberAssignments = getAllAssignmentIds(createdTeam);
                        (0, test_1.expect)(teamMemberAssignments.length).toBe(3);
                        return [4 /*yield*/, Promise.all(teamMemberAssignments.map(function (id) { return seasonFactory_1.SeasonFactory.getCookingTeamAssignment(context, id); }))];
                    case 3:
                        assignmentsBeforeDelete = _c.sent();
                        (0, test_1.expect)(assignmentsBeforeDelete.length).toBe(3);
                        // Delete the team
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.deleteCookingTeam(context, createdTeam.id)
                            // Verify team is deleted
                        ];
                    case 4:
                        // Delete the team
                        _c.sent();
                        // Verify team is deleted
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.getCookingTeamById(context, createdTeam.id, 404)];
                    case 5:
                        // Verify team is deleted
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('Team Member Management', function () {
        (0, test_1.test)('PUT /api/admin/team/[id]/members should add team member assignments', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, createdTeam, teamDetails;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Create team with members using factory
                    ];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-with-assignments", 3)];
                    case 2:
                        createdTeam = _c.sent();
                        testTeamIds.push(createdTeam.id);
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.getCookingTeamById(context, createdTeam.id)];
                    case 3:
                        teamDetails = _c.sent();
                        (0, test_1.expect)(getTeamMemberCounts(teamDetails).total).toBe(3);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('DELETE /api/admin/team/[id]/members/[memberId] should remove team assignments', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, createdTeam, assignmentIds, firstAssignmentId;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Create team with members using factory
                    ];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-for-removal", 3)];
                    case 2:
                        createdTeam = _c.sent();
                        testTeamIds.push(createdTeam.id);
                        assignmentIds = getAllAssignmentIds(createdTeam);
                        (0, test_1.expect)(assignmentIds.length).toBe(3);
                        firstAssignmentId = assignmentIds[0];
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.removeMemberFromTeam(context, createdTeam.id, firstAssignmentId)
                            // Verify the assignment was removed
                        ];
                    case 3:
                        _c.sent();
                        // Verify the assignment was removed
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.getCookingTeamAssignment(context, firstAssignmentId, 404)];
                    case 4:
                        // Verify the assignment was removed
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('Validation and Error Handling', function () {
        (0, test_1.test)('PUT /api/admin/team should reject invalid team data', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Try to create team without seasonId - should fail
                    ];
                    case 1:
                        context = _c.sent();
                        // Try to create team without seasonId - should fail
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, 0, "Invalid Team", 400)];
                    case 2:
                        // Try to create team without seasonId - should fail
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('PUT /api/admin/team should reject empty team name', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Try to create team with empty name - should fail
                    ];
                    case 1:
                        context = _c.sent();
                        // Try to create team with empty name - should fail
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "", 400)];
                    case 2:
                        // Try to create team with empty name - should fail
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('GET /api/admin/team/[id] should return 404 for non-existent team', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Try to get non-existent team - should return 404
                    ];
                    case 1:
                        context = _c.sent();
                        // Try to get non-existent team - should return 404
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.getCookingTeamById(context, 99999, 404)];
                    case 2:
                        // Try to get non-existent team - should return 404
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('POST /api/admin/team/[id] should return 404 for non-existent team', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, response;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, context.request.post("".concat(ADMIN_TEAM_ENDPOINT, "/99999"), {
                                headers: headers,
                                data: { name: "Updated Name" }
                            })];
                    case 2:
                        response = _c.sent();
                        (0, test_1.expect)(response.status()).toBe(404);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('DELETE /api/admin/team/[id] should return 404 for non-existent team', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Try to delete non-existent team - should return 404
                    ];
                    case 1:
                        context = _c.sent();
                        // Try to delete non-existent team - should return 404
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.deleteCookingTeam(context, 99999, 404)];
                    case 2:
                        // Try to delete non-existent team - should return 404
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('PUT /api/admin/team/[id]/members should reject invalid member data', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, createdTeam, invalidMemberData, response;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Create a team using factory
                    ];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "invalid-assignment-test")];
                    case 2:
                        createdTeam = _c.sent();
                        testTeamIds.push(createdTeam.id);
                        invalidMemberData = {
                            seasonId: testSeasonId,
                            name: "" // Empty name should be invalid
                        };
                        return [4 /*yield*/, seasonFactory_1.SeasonFactory.assignMemberToTeam(createdTeam.id, invalidMemberData, 400)];
                    case 3:
                        response = _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    // Cleanup after all tests
    test_1.test.afterAll(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, error_1;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                    // Clean up all created teams
                ];
                case 1:
                    context = _c.sent();
                    // Clean up all created teams
                    return [4 /*yield*/, Promise.all(testTeamIds.map(function (id) { return seasonFactory_1.SeasonFactory.deleteCookingTeam(context, id).catch(function (error) {
                            // Ignore cleanup errors
                            console.warn("Failed to cleanup team ".concat(id, ":"), error);
                        }); }))
                        // Clean up the test season
                    ];
                case 2:
                    // Clean up all created teams
                    _c.sent();
                    if (!testSeasonId) return [3 /*break*/, 6];
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, seasonFactory_1.SeasonFactory.deleteSeason(context, testSeasonId)];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _c.sent();
                    console.warn("Failed to cleanup test season ".concat(testSeasonId, ":"), error_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); });
});
