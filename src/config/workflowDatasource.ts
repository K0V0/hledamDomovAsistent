import { ChromeStorageWorkflowConfigDataSource } from '../datasource/ChromeStorageWorkflowConfigDataSource';

export const workflowConfigDataSource = new ChromeStorageWorkflowConfigDataSource(chrome.storage.local);