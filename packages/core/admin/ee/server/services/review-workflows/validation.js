'use strict';

const { uniq } = require('lodash/fp');
const { ValidationError } = require('@strapi/utils').errors;
const { getService } = require('../../utils');
const { ERRORS, MAX_WORKFLOWS, MAX_STAGES_PER_WORKFLOW } = require('../../constants/workflows');
const { clampMaxWorkflows, clampMaxStagesPerWorkflow } = require('../../utils/review-workflows');

module.exports = ({ strapi }) => {
  return {
    limits: {
      workflows: MAX_WORKFLOWS,
      stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
    },
    register({ workflows, stagesPerWorkflow }) {
      if (!Object.isFrozen(this.limits)) {
        this.limits.workflows = clampMaxWorkflows(workflows || this.limits.workflows);
        this.limits.stagesPerWorkflow = clampMaxStagesPerWorkflow(
          stagesPerWorkflow || this.limits.stagesPerWorkflow
        );
        Object.freeze(this.limits);
      }
    },
    /**
     * Validates the stages of a workflow.
     * @param {Array} stages - Array of stages to be validated.
     * @throws {ValidationError} - If the workflow has no stages or exceeds the limit.
     */
    validateWorkflowStages(stages) {
      if (!stages || stages.length === 0) {
        throw new ValidationError(ERRORS.WORKFLOW_WITHOUT_STAGES);
      }
      if (stages.length > this.limits.stagesPerWorkflow) {
        throw new ValidationError(ERRORS.STAGES_LIMIT);
      }
      // Validate stage names are not duplicated
      const stageNames = stages.map((stage) => stage.name);
      if (uniq(stageNames).length !== stageNames.length) {
        throw new ValidationError(ERRORS.DUPLICATED_STAGE_NAME);
      }
    },

    async validateWorkflowCountStages(workflowId, countAddedStages = 0) {
      const stagesService = getService('stages', { strapi });
      const countWorkflowStages = await stagesService.count({ workflowId });

      if (countWorkflowStages + countAddedStages > this.limits.stagesPerWorkflow) {
        throw new ValidationError(ERRORS.STAGES_LIMIT);
      }
    },

    /**
     * Validates the count of existing and added workflows.
     * @param {number} [countAddedWorkflows=0] - The count of workflows to be added.
     * @throws {ValidationError} - If the total count of workflows exceeds the limit.
     * @returns {Promise<void>} - A Promise that resolves when the validation is completed.
     */
    async validateWorkflowCount(countAddedWorkflows = 0) {
      const workflowsService = getService('workflows', { strapi });
      const countWorkflows = await workflowsService.count();
      if (countWorkflows + countAddedWorkflows > this.limits.workflows) {
        throw new ValidationError(ERRORS.WORKFLOWS_LIMIT);
      }
    },
  };
};
