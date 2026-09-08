import { describe, it, expect } from "vitest"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { loadConfig, ConfigNotFoundError, ConfigValidationError } from "../loader.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const testYAMLdir = join(__dirname, "..", "testYAML")

describe("loadConfig", ()=>{
    it("should load correctly valid YAML file", ()=>{
        const config = loadConfig(join(testYAMLdir, "valid.yaml"))
        expect(config.redis.host).toBe("127.0.0.1");
        expect(config.redis.port).toBe(6379);
        expect(config.budget.provider).toBe("mock");
        expect(config.budget.thresholds.warning).toBe(80);
        expect(config.budget.thresholds.critical).toBe(95);
        expect(config.routes).toHaveLength(1);
        expect(config.routes[0]?.path).toBe("/api/orders");
        expect(config.default.cost_sensitivity).toBe("medium");
    })
    it("should throw confignotfounderror if yaml doesnt exists", ()=>{
        expect(()=>loadConfig(join(testYAMLdir, "not-existing-file.yaml"))).toThrow(ConfigNotFoundError)
    })
    it("should throw confignotfounderror if yaml syntax is malformed", ()=>{
        expect(()=>loadConfig(join(testYAMLdir, "malformed.yaml"))).toThrow(ConfigNotFoundError)
    })
    it("should throw configvalidationerror if yaml file is wrongly configurated", ()=>{
        expect(()=>loadConfig(join(testYAMLdir, "invalidSchema.yaml"))).toThrow(ConfigValidationError)
    })
})