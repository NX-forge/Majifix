import { describe, expect, it } from "vitest";
import { calculatePriority } from "@/lib/priority";

describe("calculatePriority",()=>{
 it("marks a complete outage serving many people and a health facility critical",()=>{
  const result=calculatePriority({peopleAffected:600,downtimeHours:80,servesSchool:true,servesHealthFacility:true,alternativeWaterAvailable:false,allServiceInterrupted:true});
  expect(result.level).toBe("CRITICAL");
  expect(result.score).toBeGreaterThanOrEqual(8);
 });
 it("marks a small outage with alternatives normal",()=>{
  const result=calculatePriority({peopleAffected:10,downtimeHours:1,servesSchool:false,servesHealthFacility:false,alternativeWaterAvailable:true,allServiceInterrupted:false});
  expect(result.level).toBe("NORMAL");
 });
 it("marks moderate impact high",()=>{
  const result=calculatePriority({peopleAffected:250,downtimeHours:24,servesSchool:false,servesHealthFacility:false,alternativeWaterAvailable:true,allServiceInterrupted:false});
  expect(result.level).toBe("HIGH");
 });
});
