"use strict";
// Helpers to work with bdd tests for Household aggregate root and strongly related entities (Inhabitants)
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
exports.HouseholdFactory = void 0;
var test_1 = require("@playwright/test");
var testHelpers_1 = require("../testHelpers");
var salt = testHelpers_1.default.salt, headers = testHelpers_1.default.headers;
var INHABITANT_ENDPOINT = '/api/admin/inhabitant';
var HouseholdFactory = /** @class */ (function () {
    function HouseholdFactory() {
    }
    var _a;
    _a = HouseholdFactory;
    // === HOUSEHOLD METHODS ===
    HouseholdFactory.defaultHouseholdData = function (testSalt) {
        if (testSalt === void 0) { testSalt = Date.now().toString(); }
        var now = new Date();
        return {
            heynaboId: 0,
            pbsId: 0,
            name: salt('Test Household', testSalt),
            address: salt('123 Test Street', testSalt),
            movedInDate: now
        };
    };
    HouseholdFactory.createHousehold = function (context_1, householdName_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, householdName_1], args_1, true), void 0, function (context, householdName, expectedStatus) {
            var householdData, response, status, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 201; }
            return __generator(_a, function (_b) {
                switch (_b.label) {
                    case 0:
                        householdData = __assign(__assign({}, this.defaultHouseholdData()), { name: householdName });
                        return [4 /*yield*/, context.request.put('/api/admin/household', {
                                headers: headers,
                                data: householdData
                            })];
                    case 1:
                        response = _b.sent();
                        status = response.status();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _b.sent();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (expectedStatus === 201) {
                            (0, test_1.expect)(responseBody.id, 'Response should contain the new household ID').toBeDefined();
                        }
                        return [2 /*return*/, responseBody];
                }
            });
        });
    };
    /**
     * Create household with inhabitants (for 3a, 3b test scenarios)
     */
    HouseholdFactory.createHouseholdWithInhabitants = function (context_1, householdData_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, householdData_1], args_1, true), void 0, function (context, householdData, // FIXME create zod schema for household and use as type
        inhabitantCount) {
            if (inhabitantCount === void 0) { inhabitantCount = 2; }
            return __generator(_a, function (_b) {
                throw new Error('createHouseholdWithInhabitants: Not implemented - mock method');
            });
        });
    };
    /**
     * Delete household (for 3b test scenarios)
     */
    HouseholdFactory.deleteHousehold = function (context_1, householdId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, householdId_1], args_1, true), void 0, function (context, householdId, expectedStatus) {
            var response, status, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 200; }
            return __generator(_a, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, context.request.delete("/api/admin/household/".concat(householdId))];
                    case 1:
                        response = _b.sent();
                        status = response.status();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (!(expectedStatus === 200)) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _b.sent();
                        return [2 /*return*/, responseBody];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    // === INHABITANT METHODS ===
    HouseholdFactory.defaultInhabitantData = function (testSalt) {
        if (testSalt === void 0) { testSalt = Date.now().toString(); }
        return {
            heynaboId: 30000 + Math.floor(Math.random() * 70000),
            name: salt('Test', testSalt),
            lastName: salt('Inhabitant', testSalt),
            pictureUrl: null,
            birthDate: null
        };
    };
    /**
     * Create inhabitant for existing household
     */
    HouseholdFactory.createInhabitantForHousehold = function (context_1, householdId_1, inhabitantName_1) {
        var args_1 = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args_1[_i - 3] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, householdId_1, inhabitantName_1], args_1, true), void 0, function (context, householdId, inhabitantName, expectedStatus) {
            var inhabitantData, nameParts, response, status, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 201; }
            return __generator(_a, function (_b) {
                switch (_b.label) {
                    case 0:
                        inhabitantData = __assign(__assign({}, this.defaultInhabitantData()), { householdId: householdId });
                        if (inhabitantName) {
                            nameParts = inhabitantName.split(' ');
                            inhabitantData.name = nameParts[0] || 'Test';
                            inhabitantData.lastName = nameParts.slice(1).join(' ') || 'Inhabitant';
                        }
                        return [4 /*yield*/, context.request.put(INHABITANT_ENDPOINT, {
                                headers: headers,
                                data: inhabitantData
                            })];
                    case 1:
                        response = _b.sent();
                        status = response.status();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _b.sent();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (expectedStatus === 201) {
                            (0, test_1.expect)(responseBody.id, 'Response should contain the new inhabitant ID').toBeDefined();
                        }
                        return [2 /*return*/, responseBody];
                }
            });
        });
    };
    /**
     * Create inhabitant from existing user (needed by seasonFactory for team assignments)
     */
    HouseholdFactory.createInhabitantFromUser = function (context, householdId, userId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(_a, function (_b) {
            throw new Error('createInhabitantFromUser: Not implemented - mock method');
        });
    }); };
    /**
     * Create multiple inhabitants (needed by seasonFactory for team assignments)
     */
    HouseholdFactory.createInhabitants = function (context_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1], args_1, true), void 0, function (context, count, householdId) {
            if (count === void 0) { count = 5; }
            return __generator(_a, function (_b) {
                throw new Error('createInhabitants: Not implemented - mock method');
            });
        });
    };
    /**
     * Get inhabitant by ID
     */
    HouseholdFactory.getInhabitantById = function (context_1, inhabitantId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, inhabitantId_1], args_1, true), void 0, function (context, inhabitantId, expectedStatus) {
            var response, status, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 200; }
            return __generator(_a, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, context.request.get("".concat(INHABITANT_ENDPOINT, "/").concat(inhabitantId))];
                    case 1:
                        response = _b.sent();
                        status = response.status();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (!(expectedStatus === 200)) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _b.sent();
                        (0, test_1.expect)(responseBody.id).toBe(inhabitantId);
                        return [2 /*return*/, responseBody];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    /**
     * Get all inhabitants
     */
    HouseholdFactory.getAllInhabitants = function (context) { return __awaiter(void 0, void 0, void 0, function () {
        var response, responseBody;
        return __generator(_a, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, context.request.get(INHABITANT_ENDPOINT)];
                case 1:
                    response = _b.sent();
                    (0, test_1.expect)(response.status()).toBe(200);
                    return [4 /*yield*/, response.json()];
                case 2:
                    responseBody = _b.sent();
                    (0, test_1.expect)(Array.isArray(responseBody)).toBe(true);
                    return [2 /*return*/, responseBody];
            }
        });
    }); };
    /**
     * Create inhabitant with user account
     */
    HouseholdFactory.createInhabitantWithUser = function (context_1, householdId_1, inhabitantName_1, email_1) {
        var args_1 = [];
        for (var _i = 4; _i < arguments.length; _i++) {
            args_1[_i - 4] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, householdId_1, inhabitantName_1, email_1], args_1, true), void 0, function (context, householdId, inhabitantName, email, expectedStatus) {
            var inhabitantData, nameParts, response, status, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 201; }
            return __generator(_a, function (_b) {
                switch (_b.label) {
                    case 0:
                        inhabitantData = __assign(__assign({}, this.defaultInhabitantData()), { householdId: householdId, user: {
                                email: email,
                                passwordHash: 'test-hash'
                            } });
                        if (inhabitantName) {
                            nameParts = inhabitantName.split(' ');
                            inhabitantData.name = nameParts[0] || 'Test';
                            inhabitantData.lastName = nameParts.slice(1).join(' ') || 'Inhabitant';
                        }
                        return [4 /*yield*/, context.request.put(INHABITANT_ENDPOINT, {
                                headers: headers,
                                data: inhabitantData
                            })];
                    case 1:
                        response = _b.sent();
                        status = response.status();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _b.sent();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (expectedStatus === 201) {
                            (0, test_1.expect)(responseBody.id, 'Response should contain the new inhabitant ID').toBeDefined();
                            (0, test_1.expect)(responseBody.userId, 'Response should contain the new user ID').toBeDefined();
                        }
                        return [2 /*return*/, responseBody];
                }
            });
        });
    };
    /**
     * Get user by ID (for testing user associations)
     */
    HouseholdFactory.getUserById = function (context, userId) { return __awaiter(void 0, void 0, void 0, function () {
        var response, responseBody;
        return __generator(_a, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, context.request.get("/api/admin/user/".concat(userId))];
                case 1:
                    response = _b.sent();
                    (0, test_1.expect)(response.status()).toBe(200);
                    return [4 /*yield*/, response.json()];
                case 2:
                    responseBody = _b.sent();
                    (0, test_1.expect)(responseBody.id).toBe(userId);
                    return [2 /*return*/, responseBody];
            }
        });
    }); };
    /**
     * Delete inhabitant (for 4a test scenarios)
     */
    HouseholdFactory.deleteInhabitant = function (context_1, inhabitantId_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([context_1, inhabitantId_1], args_1, true), void 0, function (context, inhabitantId, expectedStatus) {
            var response, status, responseBody;
            if (expectedStatus === void 0) { expectedStatus = 200; }
            return __generator(_a, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, context.request.delete("".concat(INHABITANT_ENDPOINT, "/").concat(inhabitantId))];
                    case 1:
                        response = _b.sent();
                        status = response.status();
                        (0, test_1.expect)(status, 'Unexpected status').toBe(expectedStatus);
                        if (!(expectedStatus === 200)) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        responseBody = _b.sent();
                        return [2 /*return*/, responseBody];
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    return HouseholdFactory;
}());
exports.HouseholdFactory = HouseholdFactory;
