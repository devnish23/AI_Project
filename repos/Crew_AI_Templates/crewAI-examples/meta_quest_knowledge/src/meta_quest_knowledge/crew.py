from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.knowledge.source.pdf_knowledge_source import PDFKnowledgeSource

# Knowledge sources
pdf_source = PDFKnowledgeSource(
    file_paths=["CIS_Microsoft_Windows_Server_2019_Benchmark_v3.0.1.pdf"]
)

@CrewBase
class MetaQuestKnowledge():
	"""MetaQuestKnowledge crew"""

	agents_config = 'config/agents.yaml'
	tasks_config = 'config/tasks.yaml'

	@agent
	def meta_quest_expert(self) -> Agent:
		return Agent(
			config=self.agents_config['meta_quest_expert'],
			verbose=True
		)

	@task
	def answer_question_task(self) -> Task:
		return Task(
			config=self.tasks_config['answer_question_task'],
		)

	@crew
	def crew(self) -> Crew:
		"""Creates the MetaQuestKnowledge crew"""

		return Crew(
			agents=self.agents, # Automatically created by the @agent decorator
			tasks=self.tasks, # Automatically created by the @task decorator
			process=Process.sequential,
			verbose=True,
			knowledge_sources=[
				pdf_source
			]
		)
