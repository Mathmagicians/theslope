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
var userFactory_1 = require("~~/tests/e2e/testDataFactories/userFactory");
var testHelpers_1 = require("~~/tests/e2e/testHelpers");
var validatedBrowserContext = testHelpers_1.default.validatedBrowserContext;
// Variable to store ID for cleanup
var createdUserIds = [];
var newUser = userFactory_1.UserFactory.defaultUser();
// Test for creating and retrieving a user
(0, test_1.test)("PUT /api/admin/users should create a new user and GET should retrieve it", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var context, created, listResponse, users, foundUser;
    var browser = _b.browser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, validatedBrowserContext(browser)];
            case 1:
                context = _c.sent();
                return [4 /*yield*/, userFactory_1.UserFactory.createUser(context, newUser)
                    // Save ID for cleanup
                ];
            case 2:
                created = _c.sent();
                // Save ID for cleanup
                createdUserIds.push(created.id);
                // Verify response
                (0, test_1.expect)(created).toHaveProperty('email');
                (0, test_1.expect)(created.email).toBe(newUser.email);
                return [4 /*yield*/, context.request.get('/api/admin/users')];
            case 3:
                listResponse = _c.sent();
                (0, test_1.expect)(listResponse.status()).toBe(200);
                return [4 /*yield*/, listResponse.json()];
            case 4:
                users = _c.sent();
                foundUser = users.find(function (u) { return u.email === newUser.email; });
                (0, test_1.expect)(foundUser).toBeTruthy();
                (0, test_1.expect)(foundUser.id).toBe(created.id);
                return [2 /*return*/];
        }
    });
}); });
// Test for validation
(0, test_1.test)("PUT /api/admin/users validation should fail for invalid user data", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var context, response;
    var browser = _b.browser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                // Try to create a user without an email (should fail validation)
            ];
            case 1:
                context = _c.sent();
                return [4 /*yield*/, context.request.put('/api/admin/users', {
                        params: {
                            phone: '+4512345678',
                            systemRole: 'ADMIN'
                        }
                    })
                    // Should return 400 Bad Request for validation error
                ];
            case 2:
                response = _c.sent();
                // Should return 400 Bad Request for validation error
                (0, test_1.expect)(response.status()).toBe(400);
                return [2 /*return*/];
        }
    });
}); });
(0, test_1.test)('GET /api/admin/users should return a list of users from the database', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var context, response, users, user;
    var browser = _b.browser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, validatedBrowserContext(browser)
                // Get user list
            ];
            case 1:
                context = _c.sent();
                return [4 /*yield*/, context.request.get('/api/admin/users')];
            case 2:
                response = _c.sent();
                (0, test_1.expect)(response.status()).toBe(200);
                return [4 /*yield*/, response.json()];
            case 3:
                users = _c.sent();
                (0, test_1.expect)(Array.isArray(users)).toBe(true);
                // Verify each user has the expected properties
                if (users.length > 0) {
                    user = users[0];
                    (0, test_1.expect)(user).toHaveProperty('id');
                    (0, test_1.expect)(user).toHaveProperty('email');
                }
                return [2 /*return*/];
        }
    });
}); });
// Cleanup after all tests
test_1.test.afterAll(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var context, _i, createdUserIds_1, id, deleted, error_1;
    var browser = _b.browser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!(createdUserIds.length > 0)) return [3 /*break*/, 7];
                return [4 /*yield*/, validatedBrowserContext(browser)
                    // iterate over list and delete each user
                ];
            case 1:
                context = _c.sent();
                _i = 0, createdUserIds_1 = createdUserIds;
                _c.label = 2;
            case 2:
                if (!(_i < createdUserIds_1.length)) return [3 /*break*/, 7];
                id = createdUserIds_1[_i];
                _c.label = 3;
            case 3:
                _c.trys.push([3, 5, , 6]);
                return [4 /*yield*/, userFactory_1.UserFactory.deleteUser(context, id)];
            case 4:
                deleted = _c.sent();
                (0, test_1.expect)(deleted.id).toBe(id);
                return [3 /*break*/, 6];
            case 5:
                error_1 = _c.sent();
                console.error("Failed to delete test user with ID ".concat(id, ":"), error_1);
                return [3 /*break*/, 6];
            case 6:
                _i++;
                return [3 /*break*/, 2];
            case 7: return [2 /*return*/];
        }
    });
}); });
