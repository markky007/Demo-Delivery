import { epic, feature, owner, severity, story, testCaseId } from 'allure-js-commons';

export async function setCaseMeta(id: string, area: string, scenario: string, importance: string) {
  await testCaseId(id);
  await epic('DEMO Bang saen');
  await feature(area);
  await story(scenario);
  await severity(importance);
  await owner('QA');
}
