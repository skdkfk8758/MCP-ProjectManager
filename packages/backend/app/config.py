from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 48293
    debug: bool = False
    database_url: str = ""
    data_dir: str = ""

    model_config = {"env_prefix": "MCP_PM_"}

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.data_dir:
            self.data_dir = str(Path.home() / ".mcp-pm")
        if not self.database_url:
            db_path = Path(self.data_dir) / "mcp_pm.db"
            self.database_url = f"sqlite+aiosqlite:///{db_path}"
        Path(self.data_dir).mkdir(parents=True, exist_ok=True)


settings = Settings()
