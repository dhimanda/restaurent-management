"use strict";
const electron = require("electron");
const api = {
  menu: {
    getAll: () => electron.ipcRenderer.invoke("menu:getAll"),
    getByCategory: (categoryId) => electron.ipcRenderer.invoke("menu:getByCategory", categoryId),
    getAvailable: () => electron.ipcRenderer.invoke("menu:getAvailable"),
    create: (item) => electron.ipcRenderer.invoke("menu:create", item),
    update: (id, item) => electron.ipcRenderer.invoke("menu:update", id, item),
    delete: (id) => electron.ipcRenderer.invoke("menu:delete", id),
    toggleAvailability: (id) => electron.ipcRenderer.invoke("menu:toggleAvailability", id),
    pickImage: () => electron.ipcRenderer.invoke("menu:pickImage")
  },
  categories: {
    getAll: () => electron.ipcRenderer.invoke("categories:getAll"),
    create: (name) => electron.ipcRenderer.invoke("categories:create", name)
  },
  orders: {
    create: (order) => electron.ipcRenderer.invoke("orders:create", order),
    getActive: () => electron.ipcRenderer.invoke("orders:getActive"),
    getAll: (filters) => electron.ipcRenderer.invoke("orders:getAll", filters),
    getById: (id) => electron.ipcRenderer.invoke("orders:getById", id),
    updateStatus: (id, status) => electron.ipcRenderer.invoke("orders:updateStatus", id, status),
    cancel: (id) => electron.ipcRenderer.invoke("orders:cancel", id)
  },
  reports: {
    dailySummary: (date) => electron.ipcRenderer.invoke("reports:dailySummary", date),
    dateRange: (from, to) => electron.ipcRenderer.invoke("reports:dateRange", from, to),
    itemPerformance: (from, to) => electron.ipcRenderer.invoke("reports:itemPerformance", from, to),
    paymentBreakdown: (from, to) => electron.ipcRenderer.invoke("reports:paymentBreakdown", from, to)
  },
  settings: {
    getAll: () => electron.ipcRenderer.invoke("settings:getAll"),
    set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
    setMultiple: (settings) => electron.ipcRenderer.invoke("settings:setMultiple", settings)
  },
  sync: {
    connectDrive: () => electron.ipcRenderer.invoke("sync:connectDrive"),
    syncNow: () => electron.ipcRenderer.invoke("sync:syncNow"),
    getStatus: () => electron.ipcRenderer.invoke("sync:getStatus"),
    exportDb: () => electron.ipcRenderer.invoke("sync:exportDb"),
    importDb: () => electron.ipcRenderer.invoke("sync:importDb")
  },
  print: {
    printBill: (orderId) => electron.ipcRenderer.invoke("print:bill", orderId)
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
