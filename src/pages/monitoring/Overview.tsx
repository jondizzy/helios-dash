import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { PipeStatus, Pipe } from "../.././utils/ScdTypes";
import Icon from "./utils/NonLibShapes";
import { formatTotal } from "../.././helpers/Calculations";

const sites: Pipe[] = [
  {
    id: "S-001",
    site: "Cikarang",
    location: "West Java",
    transmission: { flowrate: 1842.6, totalizer: 12850432, status: "Normal" },
    distribution: { flowrate: 1721.4, totalizer: 11984720, status: "Normal" },
  },
  {
    id: "S-002",
    site: "Karawang",
    location: "West Java",
    transmission: { flowrate: 1624.1, totalizer: 10294718, status: "Normal" },
    distribution: { flowrate: 1498.8, totalizer: 9871543, status: "Normal" },
  },
  {
    id: "S-003",
    site: "Bekasi",
    location: "West Java",
    transmission: { flowrate: 1218.7, totalizer: 8342571, status: "Normal" },
    distribution: { flowrate: 1084.3, totalizer: 7812639, status: "Warning" },
  },
  {
    id: "S-004",
    site: "Tangerang",
    location: "Banten",
    transmission: { flowrate: 934.2, totalizer: 6439821, status: "Normal" },
    distribution: { flowrate: 876.5, totalizer: 6021458, status: "Normal" },
  },
  {
    id: "S-005",
    site: "Serang",
    location: "Banten",
    transmission: { flowrate: 748.9, totalizer: 4928210, status: "Normal" },
    distribution: { flowrate: 0, totalizer: 4387004, status: "Offline" },
  },
  {
    id: "S-006",
    site: "Bogor",
    location: "West Java",
    transmission: { flowrate: 884.5, totalizer: 5581744, status: "Normal" },
    distribution: { flowrate: 812.6, totalizer: 5112397, status: "Normal" },
  },
];
