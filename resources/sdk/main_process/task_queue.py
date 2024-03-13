import queue
import threading
import time


# 定义一个任务类
class Task:
    def __init__(self, task_type, name):
        self.task_type = task_type
        self.name = name


# 创建任务队列
task_queues = {"A": queue.Queue(), "B": queue.Queue(), "C": queue.Queue()}


# 任务处理函数
def process_task(task):
    print(f"Processing {task.task_type} task: {task.name}")
    # 模拟任务处理时间
    time.sleep(1)


# 子任务生成器
def generate_subtasks(task_type, count):
    subtasks = []
    for i in range(count):
        subtasks.append(Task(task_type, f"{task_type} Subtask {i+1}"))
    return subtasks


# 线程工作函数
def worker(task_type, next_queue):
    while True:
        task = task_queues[task_type].get()
        if task is None:  # None作为停止信号
            break
        process_task(task)
        # 根据任务类型生成新的子任务
        if next_queue:
            for subtask in generate_subtasks(
                next_queue, 2
            ):  # 假设每个任务生成2个子任务
                task_queues[next_queue].put(subtask)
        task_queues[task_type].task_done()


# 初始化工作线程
def init_workers():
    # A任务完成后生成B任务，B完成后生成C任务，C不生成新任务
    task_relations = {"A": "B", "B": "C", "C": None}
    threads = []
    for task_type, next_queue in task_relations.items():
        t = threading.Thread(target=worker, args=(task_type, next_queue))
        t.start()
        threads.append(t)
    return threads


# 检查队列是否都为空
def all_queues_empty():
    return all(q.empty() for q in task_queues.values())


# 添加初始任务到队列A
for i in range(3):  # 假设我们有3个初始A任务
    task_queues["A"].put(Task("A", f"Initial Task A{i+1}"))

# 启动工作线程
threads = init_workers()

# 监控队列，当所有队列都为空时，结束程序
try:
    while not all_queues_empty():
        time.sleep(1)
finally:
    # 发送停止信号给工作线程
    for _ in threads:
        task_queues["A"].put(None)
        task_queues["B"].put(None)
        task_queues["C"].put(None)

    # 等待所有线程结束
    for t in threads:
        t.join()

print("All tasks completed and all queues are empty.")
