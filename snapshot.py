#!/usr/bin/env python3
"""
Universal Project Snapshot Generator
Creates a comprehensive text snapshot of project structure and file contents
with enhanced detection, filtering, and performance optimizations
"""

import os
import sys
import json
import fnmatch
import concurrent.futures
from pathlib import Path
from datetime import datetime
from typing import List, Set, Dict, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import argparse
from collections import defaultdict
import time
import signal
from contextlib import contextmanager


class TimeoutError(Exception):
    """Custom timeout exception"""
    pass


@contextmanager
def timeout(seconds):
    """Timeout context manager"""
    def signal_handler(signum, frame):
        raise TimeoutError("Operation timed out")
    
    # Windows doesn't support SIGALRM, so we'll use a different approach
    if os.name == 'nt':
        # On Windows, just yield without timeout
        yield
        return
    
    signal.signal(signal.SIGALRM, signal_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)


class FileCategory(Enum):
    """Categorize files for better filtering"""
    SOURCE = "source"
    CONFIG = "config"
    DOCUMENTATION = "documentation"
    BUILD = "build"
    DEPENDENCY = "dependency"
    MEDIA = "media"
    DATA = "data"
    ARCHIVE = "archive"
    BINARY = "binary"
    OTHER = "other"


class ProjectDetector:
    """Simplified project type detection"""
    
    def __init__(self):
        self.detection_rules = {
            'Python': {
                'files': ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile', 'setup.cfg'],
                'dirs': ['venv', '.venv', '__pycache__'],
                'extensions': ['.py', '.pyw']
            },
            'JavaScript/Node.js': {
                'files': ['package.json', 'yarn.lock', 'pnpm-lock.yaml'],
                'dirs': ['node_modules'],
                'extensions': ['.js', '.mjs', '.jsx']
            },
            'TypeScript': {
                'files': ['tsconfig.json'],
                'extensions': ['.ts', '.tsx']
            },
            'React': {
                'files': ['src/App.js', 'src/App.tsx', 'src/App.jsx'],
                'dirs': ['components'],
            },
            'Vue.js': {
                'files': ['vue.config.js', 'vite.config.js'],
                'extensions': ['.vue']
            },
            'Angular': {
                'files': ['angular.json'],
            },
            'Java/Maven': {
                'files': ['pom.xml'],
                'dirs': ['src/main/java'],
                'extensions': ['.java']
            },
            'Go': {
                'files': ['go.mod', 'go.sum'],
                'extensions': ['.go']
            },
            'Rust': {
                'files': ['Cargo.toml', 'Cargo.lock'],
                'extensions': ['.rs']
            },
            'C/C++': {
                'files': ['CMakeLists.txt', 'Makefile'],
                'extensions': ['.c', '.cpp', '.h', '.hpp']
            },
            'C#/.NET': {
                'files': ['*.csproj', '*.sln'],
                'extensions': ['.cs']
            },
            'Ruby': {
                'files': ['Gemfile', 'Rakefile'],
                'extensions': ['.rb']
            },
            'PHP': {
                'files': ['composer.json', 'artisan'],
                'extensions': ['.php']
            },
            'Docker': {
                'files': ['Dockerfile', 'docker-compose.yml', '.dockerignore'],
            },
            'Git': {
                'files': ['.gitignore', '.gitattributes'],
                'dirs': ['.git'],
            },
            'Documentation': {
                'files': ['README.md', 'LICENSE', 'CHANGELOG.md'],
                'dirs': ['docs', 'documentation'],
                'extensions': ['.md', '.rst', '.txt']
            },
        }
    
    def detect_project_types(self, root_path: Path) -> Dict[str, float]:
        """Detect project types with confidence scores"""
        scores = defaultdict(float)
        
        for project_type, rules in self.detection_rules.items():
            confidence = 0.0
            matched = 0
            total_checks = 0
            
            # Check for specific files
            if 'files' in rules:
                for file_pattern in rules['files']:
                    total_checks += 1
                    if '*' in file_pattern:
                        matches = list(root_path.glob(file_pattern))
                        if matches:
                            matched += 1
                    elif (root_path / file_pattern).exists():
                        matched += 1
            
            # Check for directories
            if 'dirs' in rules:
                for dir_pattern in rules['dirs']:
                    total_checks += 1
                    if (root_path / dir_pattern).is_dir():
                        matched += 1
            
            # Check for extensions (limited sampling)
            if 'extensions' in rules:
                try:
                    # Only check first level files for speed
                    sample_files = list(root_path.glob('*'))[:50]
                    ext_files = [f for f in sample_files 
                               if f.is_file() and f.suffix in rules['extensions']]
                    if sample_files:
                        confidence_boost = len(ext_files) / len(sample_files) * 0.3
                        confidence += min(confidence_boost, 0.3)
                except Exception:
                    pass
            
            if total_checks > 0:
                confidence += (matched / total_checks) * 0.7
            
            scores[project_type] = confidence
        
        return dict(scores)
    
    def get_primary_type(self, scores: Dict[str, float], threshold: float = 0.3) -> str:
        """Get primary project type"""
        if not scores:
            return 'Unknown'
        
        significant = [(k, v) for k, v in scores.items() if v >= threshold]
        if not significant:
            significant = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return ', '.join([t for t, _ in sorted(significant, key=lambda x: x[1], reverse=True)[:5]])


class SmartFilter:
    """Intelligent file filtering system"""
    
    def __init__(self):
        self.file_categories = {
            '.py': FileCategory.SOURCE, '.js': FileCategory.SOURCE,
            '.ts': FileCategory.SOURCE, '.jsx': FileCategory.SOURCE,
            '.tsx': FileCategory.SOURCE, '.java': FileCategory.SOURCE,
            '.go': FileCategory.SOURCE, '.rs': FileCategory.SOURCE,
            '.cpp': FileCategory.SOURCE, '.c': FileCategory.SOURCE,
            '.h': FileCategory.SOURCE, '.hpp': FileCategory.SOURCE,
            '.rb': FileCategory.SOURCE, '.php': FileCategory.SOURCE,
            
            '.json': FileCategory.CONFIG, '.yaml': FileCategory.CONFIG,
            '.yml': FileCategory.CONFIG, '.toml': FileCategory.CONFIG,
            '.ini': FileCategory.CONFIG, '.cfg': FileCategory.CONFIG,
            '.conf': FileCategory.CONFIG, '.env': FileCategory.CONFIG,
            '.xml': FileCategory.CONFIG,
            
            '.md': FileCategory.DOCUMENTATION, '.rst': FileCategory.DOCUMENTATION,
            '.txt': FileCategory.DOCUMENTATION,
            
            '.jpg': FileCategory.MEDIA, '.png': FileCategory.MEDIA,
            '.gif': FileCategory.MEDIA, '.svg': FileCategory.MEDIA,
            '.mp4': FileCategory.MEDIA, '.mp3': FileCategory.MEDIA,
            
            '.csv': FileCategory.DATA, '.tsv': FileCategory.DATA,
            '.xlsx': FileCategory.DATA, '.sql': FileCategory.DATA,
            
            '.zip': FileCategory.ARCHIVE, '.tar': FileCategory.ARCHIVE,
            '.gz': FileCategory.ARCHIVE, '.rar': FileCategory.ARCHIVE,
        }
    
    def categorize_file(self, file_path: Path) -> FileCategory:
        """Categorize a file based on extension"""
        ext = file_path.suffix.lower()
        return self.file_categories.get(ext, FileCategory.OTHER)
    
    def is_likely_binary(self, file_path: Path, sample_size: int = 1024) -> bool:
        """Quick check if file appears to be binary"""
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(sample_size)
                if b'\x00' in chunk:
                    return True
                text_chars = sum(1 for byte in chunk if 32 <= byte <= 126 or byte in {9, 10, 13})
                return text_chars / len(chunk) < 0.75 if chunk else False
        except Exception:
            return True


class UniversalSnapshotGenerator:
    """Main snapshot generator with optimizations"""
    
    def __init__(self, root_dir: str = None, output_file: str = None, config: dict = None):
        self.root_dir = Path(root_dir or os.getcwd()).resolve()
        self.output_file = output_file or self._generate_output_filename()
        self.config = config or {}
        
        # Initialize components
        self.detector = ProjectDetector()
        self.filter = SmartFilter()
        
        # Statistics
        self.stats = {
            'total_files': 0,
            'included_files': 0,
            'excluded_files': 0,
            'total_size': 0,
            'errors': 0,
            'scan_time': 0
        }
        
        # Language mapping for syntax highlighting
        self.language_map = {
            '.py': 'python', '.pyw': 'python',
            '.js': 'javascript', '.mjs': 'javascript',
            '.ts': 'typescript', '.tsx': 'typescript',
            '.jsx': 'jsx',
            '.html': 'html', '.htm': 'html',
            '.css': 'css', '.scss': 'scss', '.sass': 'sass', '.less': 'less',
            '.json': 'json',
            '.xml': 'xml',
            '.yaml': 'yaml', '.yml': 'yaml',
            '.md': 'markdown', '.mdx': 'markdown',
            '.sql': 'sql',
            '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
            '.toml': 'toml',
            '.ini': 'ini', '.cfg': 'ini', '.conf': 'ini',
            '.dockerfile': 'dockerfile',
            '.go': 'go',
            '.rs': 'rust',
            '.java': 'java',
            '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp',
            '.c': 'c', '.h': 'c', '.hpp': 'cpp',
            '.rb': 'ruby',
            '.php': 'php',
            '.kt': 'kotlin', '.kts': 'kotlin',
            '.tf': 'hcl',
            '.vue': 'vue',
        }
        
        # Excluded directories
        self.excluded_dirs = {
            '.git', '.svn', '.hg', '__pycache__', '.pytest_cache',
            '.tox', '.eggs', 'venv', '.venv', 'env', '.env',
            'virtualenv', 'dist', 'build', '*.egg-info', '*.egg',
            'node_modules', '.npm', '.yarn', 'bower_components',
            'target', '.gradle', 'bin', 'obj', 'packages',
            '.idea', '.vscode', '.vs', '.settings',
            'coverage', '.coverage', 'htmlcov', '.nyc_output',
            '_build', 'site', '.sphinx',
            '__MACOSX', '.DS_Store', 'Thumbs.db',
            '.cache', '.tmp', 'tmp', 'temp', 'logs',
            'vendor', 'generated', 'auto-generated',
            '.docker', '.terraform', '.serverless', 'scripts',
        }
        
        # Maximum file size to process (5MB default)
        self.max_file_size = self.config.get('max_file_size', 5 * 1024 * 1024)
        
        # Maximum files to process
        self.max_files = self.config.get('max_files', 10000)
    
    def _generate_output_filename(self) -> str:
        """Generate output filename"""
        project_name = self.root_dir.name.replace(' ', '_')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"snapshot_{project_name}_{timestamp}.txt"
    
    def _should_exclude_dir(self, dir_name: str) -> bool:
        """Check if directory should be excluded"""
        if dir_name in self.excluded_dirs:
            return True
        
        for pattern in self.excluded_dirs:
            if fnmatch.fnmatch(dir_name, pattern):
                return True
        
        # Skip hidden directories except .github
        if dir_name.startswith('.') and dir_name not in {'.github', '.gitlab'}:
            return True
        
        return False
    
    def _read_file_safe(self, file_path: Path) -> str:
        """Safely read file content"""
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1', 'ascii']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                    
                    # Truncate if too long
                    max_length = self.config.get('max_content_length', 50000)
                    if len(content) > max_length:
                        content = content[:max_length] + f"\n\n[... Content truncated at {max_length} characters]"
                    
                    return content
            except (UnicodeDecodeError, UnicodeError):
                continue
            except Exception:
                continue
        
        return "[Unable to decode file content]"
    
    def _format_size(self, size: int) -> str:
        """Format file size to human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    def _print_progress(self, message: str):
        """Print progress message"""
        print(f"  {message}", flush=True)
    
    def generate_snapshot(self) -> str:
        """Generate complete project snapshot"""
        sections = []
        start_time = time.time()
        
        try:
            # Header
            self._print_progress("Generating header...")
            sections.append(self._generate_header())
            
            # Project analysis
            self._print_progress("Analyzing project type...")
            sections.append(self._generate_project_analysis())
            
            # Directory structure
            self._print_progress("Building directory tree...")
            sections.append(self._generate_directory_tree())
            
            # File contents
            if not self.config.get('no_content'):
                self._print_progress("Processing file contents...")
                sections.append(self._generate_file_contents())
            else:
                self._print_progress("Skipping file contents (--no-content)")
            
            # Statistics
            self._print_progress("Generating statistics...")
            sections.append(self._generate_statistics())
            
            # Recommendations
            self._print_progress("Generating recommendations...")
            sections.append(self._generate_recommendations())
            
        except KeyboardInterrupt:
            print("\n⚠ Snapshot generation interrupted by user")
            sections.append("\n[SNAPSHOT GENERATION INTERRUPTED]")
        except Exception as e:
            print(f"\n⚠ Error during snapshot generation: {e}")
            sections.append(f"\n[ERROR: {str(e)}]")
        
        self.stats['scan_time'] = time.time() - start_time
        
        return "\n\n".join(sections)
    
    def _generate_header(self) -> str:
        """Generate header section"""
        return "\n".join([
            "=" * 80,
            "PROJECT SNAPSHOT",
            "=" * 80,
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Root Directory: {self.root_dir}",
            f"Project Name: {self.root_dir.name}",
            "=" * 80,
        ])
    
    def _generate_project_analysis(self) -> str:
        """Generate project analysis section"""
        analysis = [
            "PROJECT ANALYSIS",
            "-" * 40,
        ]
        
        try:
            # Detect project types
            scores = self.detector.detect_project_types(self.root_dir)
            primary_type = self.detector.get_primary_type(scores)
            
            analysis.append(f"Primary Type: {primary_type}")
            
            # Show top detected types
            significant_types = [(t, s) for t, s in scores.items() if s >= 0.2]
            if significant_types:
                analysis.append("\nDetected Technologies:")
                for tech, score in sorted(significant_types, key=lambda x: x[1], reverse=True)[:5]:
                    analysis.append(f"  • {tech}: {score:.2%}")
        except Exception as e:
            analysis.append(f"Project detection error: {e}")
        
        return "\n".join(analysis)
    
    def _generate_directory_tree(self) -> str:
        """Generate ASCII directory tree"""
        tree = [
            "DIRECTORY STRUCTURE",
            "-" * 40,
            f"{self.root_dir.name}/",
        ]
        
        try:
            tree.append(self._build_tree(self.root_dir, max_depth=self.config.get('max_depth', 3)))
        except Exception as e:
            tree.append(f"[Error building tree: {e}]")
        
        return "\n".join(tree)
    
    def _build_tree(self, directory: Path, prefix: str = "", max_depth: int = 3) -> str:
        """Build ASCII tree representation with depth limit"""
        if max_depth <= 0:
            return f"{prefix}[Max depth reached]\n"
        
        tree_str = ""
        
        try:
            # Sort and limit items to prevent overwhelming output
            items = sorted(directory.iterdir(), 
                          key=lambda x: (not x.is_dir(), x.name.lower()))
            items = items[:100]  # Limit to 100 items per directory
        except PermissionError:
            return f"{prefix}[Permission Denied]\n"
        except Exception as e:
            return f"{prefix}[Error: {e}]\n"
        
        for i, item in enumerate(items):
            if i >= 50:  # Limit displayed items
                tree_str += f"{prefix}[... {len(items) - 50} more items]\n"
                break
            
            is_last = i == len(items) - 1 or i == 49
            
            if item.is_dir():
                if self._should_exclude_dir(item.name):
                    tree_str += f"{prefix}{'└── ' if is_last else '├── '}{item.name}/ [excluded]\n"
                    continue
                
                tree_str += f"{prefix}{'└── ' if is_last else '├── '}{item.name}/\n"
                new_prefix = prefix + ('    ' if is_last else '│   ')
                tree_str += self._build_tree(item, new_prefix, max_depth - 1)
            else:
                try:
                    size = item.stat().st_size
                    size_str = self._format_size(size)
                    tree_str += f"{prefix}{'└── ' if is_last else '├── '}{item.name} ({size_str})\n"
                except Exception:
                    tree_str += f"{prefix}{'└── ' if is_last else '├── '}{item.name} [error]\n"
        
        return tree_str
    
    def _collect_files(self) -> List[Path]:
        """Collect files to process with progress indication"""
        files = []
        excluded_count = 0
        
        self._print_progress("Scanning files...")
        
        try:
            for root, dirs, filenames in os.walk(self.root_dir):
                # Filter directories in-place
                dirs[:] = [d for d in dirs if not self._should_exclude_dir(d)]
                
                # Process files
                for filename in filenames:
                    file_path = Path(root) / filename
                    
                    # Quick size check
                    try:
                        if file_path.stat().st_size > self.max_file_size:
                            excluded_count += 1
                            continue
                    except Exception:
                        continue
                    
                    # Skip binary files quickly
                    if self.filter.is_likely_binary(file_path):
                        excluded_count += 1
                        continue
                    
                    files.append(file_path)
                    
                    # Limit total files
                    if len(files) >= self.max_files:
                        self._print_progress(f"Reached maximum file limit ({self.max_files})")
                        break
                
                if len(files) >= self.max_files:
                    break
                
                # Progress indication
                if len(files) % 100 == 0 and len(files) > 0:
                    self._print_progress(f"Found {len(files)} files...")
        
        except Exception as e:
            self._print_progress(f"Error during file scan: {e}")
        
        self.stats['total_files'] = len(files) + excluded_count
        self.stats['excluded_files'] = excluded_count
        
        return sorted(files, key=lambda x: str(x.relative_to(self.root_dir)))
    
    def _generate_file_contents(self) -> str:
        """Generate file contents section"""
        content_sections = [
            "FILE CONTENTS",
            "=" * 80
        ]
        
        # Collect files
        files = self._collect_files()
        self._print_progress(f"Processing {len(files)} files...")
        
        processed_count = 0
        for file_path in files:
            try:
                relative_path = file_path.relative_to(self.root_dir)
                file_size = file_path.stat().st_size
                
                content_sections.append("")
                content_sections.append("-" * 80)
                content_sections.append(f"FILE: {relative_path}")
                content_sections.append(f"SIZE: {self._format_size(file_size)}")
                content_sections.append(f"MODIFIED: {datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')}")
                content_sections.append("-" * 80)
                
                # Read file content
                content = self._read_file_safe(file_path)
                
                # Add syntax highlighting hint
                ext = file_path.suffix.lower()
                lang = self.language_map.get(ext, '')
                if lang:
                    content_sections.append(f"```{lang}")
                else:
                    content_sections.append("```")
                
                content_sections.append(content)
                content_sections.append("```")
                
                processed_count += 1
                self.stats['included_files'] += 1
                self.stats['total_size'] += file_size
                
                # Progress indication
                if processed_count % 10 == 0:
                    self._print_progress(f"Processed {processed_count}/{len(files)} files...")
                
            except Exception as e:
                self.stats['errors'] += 1
                content_sections.append(f"[Error processing {file_path}: {str(e)}]")
        
        return "\n".join(content_sections)
    
    def _generate_statistics(self) -> str:
        """Generate statistics section"""
        return "\n".join([
            "SNAPSHOT STATISTICS",
            "=" * 80,
            f"Scan time: {self.stats['scan_time']:.2f} seconds",
            f"Total files found: {self.stats['total_files']}",
            f"Files included: {self.stats['included_files']}",
            f"Files excluded: {self.stats['excluded_files']}",
            f"Total snapshot size: {self._format_size(self.stats['total_size'])}",
            f"Errors encountered: {self.stats['errors']}",
            "=" * 80,
        ])
    
    def _generate_recommendations(self) -> str:
        """Generate recommendations"""
        recommendations = [
            "RECOMMENDATIONS",
            "-" * 40,
        ]
        
        # Check for common files
        common_files = {
            'README.md': 'Project documentation',
            'LICENSE': 'License file',
            '.gitignore': 'Git ignore rules',
        }
        
        missing = [f for f, desc in common_files.items() 
                  if not (self.root_dir / f).exists()]
        
        if missing:
            recommendations.append("Consider adding these files:")
            for file in missing:
                recommendations.append(f"  • {file} - {common_files[file]}")
        else:
            recommendations.append("✓ All common project files present")
        
        return "\n".join(recommendations)
    
    def save_snapshot(self, snapshot: str = None):
        """Save snapshot to file"""
        if snapshot is None:
            snapshot = self.generate_snapshot()
        
        output_path = Path(self.output_file)
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(snapshot)
            
            print(f"\n✓ Snapshot saved to: {output_path}")
            print(f"  Size: {self._format_size(output_path.stat().st_size)}")
            
            return str(output_path)
        except Exception as e:
            print(f"✗ Error saving snapshot: {e}")
            return None


def main():
    """Main entry point with progress indicators"""
    parser = argparse.ArgumentParser(
        description='Project Snapshot Generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    parser.add_argument('directory', nargs='?', default=os.getcwd(),
                       help='Project directory to snapshot')
    
    parser.add_argument('-o', '--output', help='Output file path')
    
    parser.add_argument('--max-size', type=int, default=5,
                       help='Maximum file size in MB (default: 5)')
    
    parser.add_argument('--max-files', type=int, default=1000,
                       help='Maximum number of files to process (default: 1000)')
    
    parser.add_argument('--no-content', action='store_true',
                       help='Skip file contents')
    
    parser.add_argument('--max-depth', type=int, default=3,
                       help='Maximum directory depth for tree (default: 3)')
    
    args = parser.parse_args()
    
    # Build configuration
    config = {
        'max_file_size': args.max_size * 1024 * 1024,
        'max_files': args.max_files,
        'no_content': args.no_content,
        'max_depth': args.max_depth,
    }
    
    print("=" * 60)
    print("PROJECT SNAPSHOT GENERATOR")
    print("=" * 60)
    print(f"Directory: {args.directory}")
    print(f"Max file size: {args.max_size}MB")
    print(f"Max files: {args.max_files}")
    print("=" * 60)
    print()
    
    # Create and run generator
    generator = UniversalSnapshotGenerator(
        root_dir=args.directory,
        output_file=args.output,
        config=config
    )
    
    print("🔍 Analyzing project...")
    
    try:
        snapshot = generator.generate_snapshot()
        output_path = generator.save_snapshot(snapshot)
        
        if output_path:
            print(f"\n✅ Snapshot generated successfully!")
            print(f"📄 Output: {output_path}")
    except KeyboardInterrupt:
        print("\n⚠ Process interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()