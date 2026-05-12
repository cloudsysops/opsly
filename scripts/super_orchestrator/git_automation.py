#!/usr/bin/env python3
"""
Git Automation - Automatización de commits y pushes
"""
import os
import subprocess
from datetime import datetime

class GitAutomation:
    """Automatiza operaciones git"""
    
    def __init__(self, repo_path: str = None):
        self.repo_path = repo_path or os.getcwd()
    
    def _run(self, cmd: list, check: bool = True) -> subprocess.CompletedProcess:
        """Ejecuta comando git"""
        return subprocess.run(
            cmd,
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            check=check
        )
    
    def get_status(self) -> dict:
        """Obtiene estado del repositorio"""
        try:
            result = self._run(['git', 'status', '--porcelain'])
            files = [line[3:] for line in result.stdout.strip().split('\n') if line]
            return {"clean": len(files) == 0, "files": files}
        except subprocess.CalledProcessError as e:
            return {"error": e.stderr}
    
    def get_branch(self) -> str:
        """Obtiene rama actual"""
        try:
            result = self._run(['git', 'branch', '--show-current'])
            return result.stdout.strip()
        except:
            return "unknown"
    
    def auto_commit(self, message: str, branch: str = None) -> dict:
        """Hace commit automático"""
        try:
            # Stage all
            self._run(['git', 'add', '-A'])
            
            # Check if there are changes
            status = self.get_status()
            if status.get('clean'):
                return {"success": False, "message": "No changes to commit"}
            
            # Commit
            self._run(['git', 'commit', '-m', message])
            
            return {
                "success": True,
                "message": "Committed successfully",
                "branch": self.get_branch()
            }
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": e.stderr}
    
    def auto_push(self, branch: str = None) -> dict:
        """Hace push automático"""
        try:
            target_branch = branch or self.get_branch()
            self._run(['git', 'push', 'origin', target_branch])
            return {"success": True, "branch": target_branch}
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": e.stderr}
    
    def auto_commit_and_push(self, message: str, branch: str = None) -> dict:
        """Hace commit y push"""
        commit_result = self.auto_commit(message, branch)
        if not commit_result.get('success'):
            return commit_result
        
        push_result = self.auto_push(branch)
        return {
            "success": push_result.get('success', False),
            "commit": commit_result.get('message'),
            "push": push_result,
            "branch": commit_result.get('branch')
        }
    
    def create_branch(self, branch_name: str) -> dict:
        """Crea nueva rama"""
        try:
            self._run(['git', 'checkout', '-b', branch_name])
            return {"success": True, "branch": branch_name}
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": e.stderr}
    
    def checkout(self, branch: str) -> dict:
        """Cambia de rama"""
        try:
            self._run(['git', 'checkout', branch])
            return {"success": True, "branch": branch}
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": e.stderr}
    
    def get_diff(self, target: str = "HEAD") -> str:
        """Obtiene diff"""
        try:
            result = self._run(['git', 'diff', target])
            return result.stdout
        except:
            return ""
    
    def get_recent_commits(self, count: int = 5) -> list:
        """Obtiene commits recientes"""
        try:
            result = self._run(['git', 'log', f'-{count}', '--oneline'])
            return result.stdout.strip().split('\n')
        except:
            return []
    
    def pull(self) -> dict:
        """Hace pull"""
        try:
            self._run(['git', 'pull', 'origin', self.get_branch()])
            return {"success": True}
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": e.stderr}

if __name__ == "__main__":
    git = GitAutomation()
    
    # Ejemplo de uso
    print("Branch:", git.get_branch())
    print("Status:", git.get_status())
    print("Recent commits:", git.get_recent_commits(3))