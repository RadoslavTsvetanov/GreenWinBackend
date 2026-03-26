export enum TaskRunMode {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
}

export enum TaskStatus {
  DRAFT = 'draft',
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  POSTPONED = 'postponed',
}

export enum TaskCodeType {
  LAMBDA = 'lambda',
  DOCKER = 'docker',
}
