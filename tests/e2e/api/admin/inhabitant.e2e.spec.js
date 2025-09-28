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
var useHouseholdValidation_1 = require("~/composables/useHouseholdValidation");
var householdFactory_1 = require("../../testDataFactories/householdFactory");
var testHelpers_1 = require("../../testHelpers");
var InhabitantResponseSchema = (0, useHouseholdValidation_1.useHouseholdValidation)().InhabitantResponseSchema;
var headers = testHelpers_1.default.headers, validatedBrowserContext = testHelpers_1.default.validatedBrowserContext;
// Variables to store IDs for cleanup
var testHouseholdId;
var testInhabitantIds = [];
test_1.test.describe('Admin Inhabitant API', function () {
    // Setup test household before all tests
    test_1.test.beforeAll(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, created;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                case 1:
                    context = _c.sent();
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.createHousehold(context, {
                            heynaboId: 9001,
                            pbsId: 9001,
                            name: 'Test Household for Inhabitant Tests',
                            address: '123 Test Street',
                            movedInDate: new Date()
                        })];
                case 2:
                    created = _c.sent();
                    testHouseholdId = created.id;
                    console.info("Created test household ".concat(created.name, " with ID ").concat(testHouseholdId));
                    return [2 /*return*/];
            }
        });
    }); });
    test_1.test.describe('Inhabitant CRUD Operations', function () {
        (0, test_1.test)('PUT /api/admin/inhabitant should create a new inhabitant and GET should retrieve it', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, testInhabitant, retrievedInhabitant;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId)];
                    case 2:
                        testInhabitant = _c.sent();
                        (0, test_1.expect)(testInhabitant.id).toBeDefined();
                        testInhabitantIds.push(testInhabitant.id);
                        // Verify response structure
                        (0, test_1.expect)(testInhabitant.id).toBeGreaterThanOrEqual(0);
                        (0, test_1.expect)(testInhabitant.householdId).toEqual(testHouseholdId);
                        // Validate the response matches our schema
                        (0, test_1.expect)(function () { return InhabitantResponseSchema.parse(testInhabitant); }).not.toThrow();
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.getInhabitantById(context, testInhabitant.id)];
                    case 3:
                        retrievedInhabitant = _c.sent();
                        (0, test_1.expect)(retrievedInhabitant.id).toBe(testInhabitant.id);
                        (0, test_1.expect)(retrievedInhabitant.name).toBe(testInhabitant.name);
                        (0, test_1.expect)(retrievedInhabitant.householdId).toBe(testInhabitant.householdId);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('GET /api/admin/inhabitant should list all inhabitants', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, testInhabitant, inhabitants, foundInhabitant;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'List-Test-Inhabitant')];
                    case 2:
                        testInhabitant = _c.sent();
                        (0, test_1.expect)(testInhabitant.id).toBeDefined();
                        testInhabitantIds.push(testInhabitant.id);
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.getAllInhabitants(context)];
                    case 3:
                        inhabitants = _c.sent();
                        (0, test_1.expect)(Array.isArray(inhabitants)).toBe(true);
                        foundInhabitant = inhabitants.find(function (i) { return i.name.includes(testInhabitant.name) && i.id === testInhabitant.id; });
                        (0, test_1.expect)(foundInhabitant).toBeTruthy();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('GET /api/admin/inhabitant/[id] should get specific inhabitant details', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, createdInhabitant, inhabitantDetails;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'Details-Test-Inhabitant')];
                    case 2:
                        createdInhabitant = _c.sent();
                        (0, test_1.expect)(createdInhabitant.id).toBeDefined();
                        testInhabitantIds.push(createdInhabitant.id);
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.getInhabitantById(context, createdInhabitant.id)];
                    case 3:
                        inhabitantDetails = _c.sent();
                        (0, test_1.expect)(inhabitantDetails.id).toBe(createdInhabitant.id);
                        (0, test_1.expect)(inhabitantDetails.name).toBe(createdInhabitant.name);
                        (0, test_1.expect)(inhabitantDetails.householdId).toBe(testHouseholdId);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('DELETE /api/admin/inhabitant/[id] should delete the inhabitant', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, createdInhabitant;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'Delete-Test-Inhabitant')];
                    case 2:
                        createdInhabitant = _c.sent();
                        (0, test_1.expect)(createdInhabitant.id).toBeDefined();
                        // Do not add to cleanup, we are deleting it here
                        // Delete the inhabitant
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.deleteInhabitant(context, createdInhabitant.id)
                            // Verify inhabitant is deleted
                        ];
                    case 3:
                        // Do not add to cleanup, we are deleting it here
                        // Delete the inhabitant
                        _c.sent();
                        // Verify inhabitant is deleted
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.getInhabitantById(context, createdInhabitant.id, 404)];
                    case 4:
                        // Verify inhabitant is deleted
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('Inhabitant with User Account', function () {
        (0, test_1.test)('PUT /api/admin/inhabitant should create inhabitant with user account', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, testInhabitant;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.createInhabitantWithUser(context, testHouseholdId, 'User-Test-Inhabitant', 'usertest@example.com')];
                    case 2:
                        testInhabitant = _c.sent();
                        (0, test_1.expect)(testInhabitant.id).toBeDefined();
                        testInhabitantIds.push(testInhabitant.id);
                        // Verify inhabitant has user association
                        (0, test_1.expect)(testInhabitant.userId).toBeDefined();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('DELETE inhabitant should clear weak association with user account', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context, testInhabitant, userId, user;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                    case 1:
                        context = _c.sent();
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.createInhabitantWithUser(context, testHouseholdId, 'User-Delete-Test-Inhabitant', 'userdelete@example.com')];
                    case 2:
                        testInhabitant = _c.sent();
                        userId = testInhabitant.userId;
                        (0, test_1.expect)(userId).toBeDefined();
                        // Delete the inhabitant
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.deleteInhabitant(context, testInhabitant.id)
                            // Verify inhabitant is deleted
                        ];
                    case 3:
                        // Delete the inhabitant
                        _c.sent();
                        // Verify inhabitant is deleted
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.getInhabitantById(context, testInhabitant.id, 404)
                            // Verify user still exists (weak association)
                        ];
                    case 4:
                        // Verify inhabitant is deleted
                        _c.sent();
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.getUserById(context, userId)];
                    case 5:
                        user = _c.sent();
                        (0, test_1.expect)(user.id).toBe(userId);
                        (0, test_1.expect)(user.inhabitantId).toBeNull(); // Reference should be cleared
                        return [2 /*return*/];
                }
            });
        }); });
    });
    test_1.test.describe('Validation and Error Handling', function () {
        (0, test_1.test)('PUT /api/admin/inhabitant should reject invalid inhabitant data', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Try to create inhabitant without householdId - should fail
                    ];
                    case 1:
                        context = _c.sent();
                        // Try to create inhabitant without householdId - should fail
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.createInhabitantForHousehold(context, 0, 'Invalid-Test-Inhabitant', 400)];
                    case 2:
                        // Try to create inhabitant without householdId - should fail
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('PUT /api/admin/inhabitant should reject empty name', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Try to create inhabitant with empty name - should fail
                    ];
                    case 1:
                        context = _c.sent();
                        // Try to create inhabitant with empty name - should fail
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, '', 400)];
                    case 2:
                        // Try to create inhabitant with empty name - should fail
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('GET /api/admin/inhabitant/[id] should return 404 for non-existent inhabitant', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Try to get non-existent inhabitant - should return 404
                    ];
                    case 1:
                        context = _c.sent();
                        // Try to get non-existent inhabitant - should return 404
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.getInhabitantById(context, 99999, 404)];
                    case 2:
                        // Try to get non-existent inhabitant - should return 404
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, test_1.test)('DELETE /api/admin/inhabitant/[id] should return 404 for non-existent inhabitant', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
            var context;
            var browser = _b.browser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                        // Try to delete non-existent inhabitant - should return 404
                    ];
                    case 1:
                        context = _c.sent();
                        // Try to delete non-existent inhabitant - should return 404
                        return [4 /*yield*/, householdFactory_1.HouseholdFactory.deleteInhabitant(context, 99999, 404)];
                    case 2:
                        // Try to delete non-existent inhabitant - should return 404
                        _c.sent();
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
                    // Clean up all created inhabitants
                ];
                case 1:
                    context = _c.sent();
                    // Clean up all created inhabitants
                    return [4 /*yield*/, Promise.all(testInhabitantIds.map(function (id) { return householdFactory_1.HouseholdFactory.deleteInhabitant(context, id).catch(function (error) {
                            // Ignore cleanup errors
                            console.warn("Failed to cleanup inhabitant ".concat(id, ":"), error);
                        }); }))
                        // Clean up the test household
                    ];
                case 2:
                    // Clean up all created inhabitants
                    _c.sent();
                    if (!testHouseholdId) return [3 /*break*/, 6];
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.deleteHousehold(context, testHouseholdId)];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _c.sent();
                    console.warn("Failed to cleanup test household ".concat(testHouseholdId, ":"), error_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); });
});
