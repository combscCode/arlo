import re
from datetime import datetime
from typing import IO, List, Union
from flask import Response

from ..models import *  # pylint: disable=wildcard-import

clean_name_re = re.compile(r"[^a-zA-Z0-9]+")


def election_timestamp_name(election: Election) -> str:
    election_name = re.sub(clean_name_re, "-", str(election.audit_name))
    now = datetime.now(timezone.utc).isoformat(timespec="minutes")
    return f"{election_name}-{now}"


def jurisdiction_timestamp_name(election: Election, jurisdiction: Jurisdiction) -> str:
    election_name = re.sub(clean_name_re, "-", str(election.audit_name))
    jurisdiction_name = re.sub(clean_name_re, "-", str(jurisdiction.name))
    now = datetime.now(timezone.utc).isoformat(timespec="minutes")
    return f"{jurisdiction_name}-{election_name}-{now}"


def csv_response(csv_file: Union[IO, bytes], filename: str) -> Response:
    return Response(
        csv_file,
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def merge_csvs(names: List[str], csv_files: List[IO]) -> bytes:
    if len(names) != len(csv_files):
        raise ValueError(
            "names and csv_files passed to merge_csvs must have the same length."
        )
    if len(names) == 0:
        raise ValueError("length of lists passed to merge_csv must be non-zero")
    merged_lines = []
    for name, csv_file in zip(names, csv_files):
        if not csv_file.readable():
            raise ValueError(f"Could not read csv_file {csv_file}")
        for i, line in enumerate(csv_file.readlines()):
            if i == 0:
                # Extract header from first file
                if len(merged_lines) == 0:
                    merged_lines.append(b"Jurisdiction Name," + line)
            else:
                merged_lines.append(bytes(name, encoding="utf8") + b"," + line)
        if merged_lines[-1][-1] != ord("\n"):
            merged_lines[-1] += b"\n"
    return b"".join(merged_lines)
