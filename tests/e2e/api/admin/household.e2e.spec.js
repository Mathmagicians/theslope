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
var householdFactory_1 = require("../../testDataFactories/householdFactory");
var testHelpers_1 = require("../../testHelpers");
var validatedBrowserContext = testHelpers_1.default.validatedBrowserContext;
// Variables to store IDs for cleanup
var testHouseholdIds = [];
test_1.test.describe('Household /api/admin/household CRUD operations', function () {
    (0, test_1.test)('PUT can create and GET can retrieve with status 200', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, household;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                    // Create household
                ];
                case 1:
                    context = _c.sent();
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.createHousehold(context, 'Test Household Creation')];
                case 2:
                    household = _c.sent();
                    (0, test_1.expect)(household.id).toBeDefined();
                    testHouseholdIds.push(household.id);
                    // Verify response structure
                    (0, test_1.expect)(household.id).toBeGreaterThanOrEqual(0);
                    (0, test_1.expect)(household.name).toBe('Test Household Creation');
                    (0, test_1.expect)(household.address).toContain('123 Andeby');
                    (0, test_1.expect)(household.heynaboId).toBeDefined();
                    (0, test_1.expect)(household.pbsId).toBeDefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('POST can update existing household with status 200', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, household, updatedData, response, updatedHousehold;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                    // Create household first
                ];
                case 1:
                    context = _c.sent();
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.createHousehold(context, 'Original Name')];
                case 2:
                    household = _c.sent();
                    testHouseholdIds.push(household.id);
                    updatedData = {
                        name: 'Updated Household Name',
                        address: 'Updated Address 456'
                    };
                    return [4 /*yield*/, context.request.post("/api/admin/household/".concat(household.id), {
                            headers: { 'Content-Type': 'application/json' },
                            data: updatedData
                        })];
                case 3:
                    response = _c.sent();
                    (0, test_1.expect)(response.status()).toBe(200);
                    return [4 /*yield*/, response.json()];
                case 4:
                    updatedHousehold = _c.sent();
                    (0, test_1.expect)(updatedHousehold.name).toBe(updatedData.name);
                    (0, test_1.expect)(updatedHousehold.address).toBe(updatedData.address);
                    (0, test_1.expect)(updatedHousehold.id).toBe(household.id);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('DELETE can remove existing household with status 200', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, household, deletedHousehold, response;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                    // Create household
                ];
                case 1:
                    context = _c.sent();
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.createHousehold(context, 'Household To Delete')
                        // Delete household
                    ];
                case 2:
                    household = _c.sent();
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.deleteHousehold(context, household.id)];
                case 3:
                    deletedHousehold = _c.sent();
                    (0, test_1.expect)(deletedHousehold.id).toBe(household.id);
                    return [4 /*yield*/, context.request.get("/api/admin/household/".concat(household.id))];
                case 4:
                    response = _c.sent();
                    (0, test_1.expect)(response.status()).toBe(404);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('PUT can create household with inhabitants', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, _c, household, inhabitants;
        var browser = _b.browser;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                    // Create household with inhabitants
                ];
                case 1:
                    context = _d.sent();
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.createHouseholdWithInhabitants(context, 'Household With Inhabitants', 3)];
                case 2:
                    _c = _d.sent(), household = _c.household, inhabitants = _c.inhabitants;
                    testHouseholdIds.push(household.id);
                    (0, test_1.expect)(household.id).toBeDefined();
                    (0, test_1.expect)(inhabitants.length).toBe(3);
                    inhabitants.forEach(function (inhabitant) {
                        (0, test_1.expect)(inhabitant.id).toBeDefined();
                        (0, test_1.expect)(inhabitant.householdId).toBe(household.id);
                        (0, test_1.expect)(inhabitant.name).toBeDefined();
                        (0, test_1.expect)(inhabitant.lastName).toBeDefined();
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('DELETE should cascade delete inhabitants (strong relation)', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, result, inhabitantIds, checksAfter;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                case 1:
                    context = _c.sent();
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.createHouseholdWithInhabitants(context, 'Household For Cascade Delete', 3)
                        // Don't add to cleanup - we're testing deletion
                        // Verify inhabitants were created (returned IDs prove creation succeeded)
                    ];
                case 2:
                    result = _c.sent();
                    // Don't add to cleanup - we're testing deletion
                    // Verify inhabitants were created (returned IDs prove creation succeeded)
                    (0, test_1.expect)(result.household.id).toBeGreaterThan(0);
                    (0, test_1.expect)(result.inhabitants.length).toBe(3);
                    inhabitantIds = result.inhabitants.map(function (i) { return i.id; });
                    (0, test_1.expect)(inhabitantIds[0]).toBeGreaterThan(0);
                    (0, test_1.expect)(inhabitantIds[1]).toBeGreaterThan(0);
                    (0, test_1.expect)(inhabitantIds[2]).toBeGreaterThan(0);
                    // WHEN: Household is deleted
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.deleteHousehold(context, result.household.id)
                        // THEN: All inhabitants should be cascade deleted
                    ];
                case 3:
                    // WHEN: Household is deleted
                    _c.sent();
                    return [4 /*yield*/, Promise.all(inhabitantIds.map(function (id) { return context.request.get("/api/admin/inhabitant/".concat(id)); }))];
                case 4:
                    checksAfter = _c.sent();
                    checksAfter.forEach(function (response) {
                        (0, test_1.expect)(response.status()).toBe(404);
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('GET /api/admin/household/[id] should return 404 for non-existent household', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context, response;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                case 1:
                    context = _c.sent();
                    return [4 /*yield*/, context.request.get('/api/admin/household/99999')];
                case 2:
                    response = _c.sent();
                    (0, test_1.expect)(response.status()).toBe(404);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('DELETE /api/admin/household/[id] should return 404 for non-existent household', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
                case 1:
                    context = _c.sent();
                    return [4 /*yield*/, householdFactory_1.HouseholdFactory.deleteHousehold(context, 99999, 404)];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Cleanup after all tests
    test_1.test.afterAll(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var context;
        var browser = _b.browser;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                    // Clean up all created households
                ];
                case 1:
                    context = _c.sent();
                    // Clean up all created households
                    return [4 /*yield*/, Promise.all(testHouseholdIds.map(function (id) { return householdFactory_1.HouseholdFactory.deleteHousehold(context, id).catch(function (error) {
                            // Ignore cleanup errors
                            console.warn("Failed to cleanup household ".concat(id, ":"), error);
                        }); }))];
                case 2:
                    // Clean up all created households
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
