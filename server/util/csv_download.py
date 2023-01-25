import re
from datetime import datetime
from typing import IO, List
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


def csv_response(csv_file: IO, filename: str) -> Response:
    return Response(
        csv_file,
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def merge_csvs(names: List[str], csv_files: List[IO]) -> str:
    # TODO: clean this function up a bit.
    merged_file = [b"Jusrisdiction Name," + csv_files[0].readline()]
    for name, csv_file in zip(names, csv_files):
        if not csv_file.readable():
            # TODO: Make better error statement.
            raise ValueError("csv file should be readable!")
        for line in csv_file.readlines()[1:]:
            merged_file.append(bytes(name, encoding="utf8") + b"," + line)
        if merged_file[-1][-1] != "\n":
            merged_file[-1] += b"\n"
    return merged_file
